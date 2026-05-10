const pool = require('../config/database');
const { generateDailySessions } = require('../services/cronService');
const { createNotification } = require('../services/notificationService');

const createSchedule = async (req, res) => {
  try {
    const { title, description, day_of_week, start_time, duration_minutes, course_id } = req.body;
    const teacher_id = req.user.id;

    if (!title || !day_of_week || !start_time) {
      return res.status(400).json({ error: 'Title, day_of_week, and start_time are required' });
    }

    // Get teacher email
    const teacherResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [teacher_id]
    );
    const teacherEmail = teacherResult.rows[0]?.email;

    // Build next occurrence datetime for the Meet link
    const now = new Date();
    const [hours, minutes] = start_time.split(':');
    const scheduledAt = new Date();
    scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    if (scheduledAt < now) scheduledAt.setDate(scheduledAt.getDate() + 1);

    // Generate real Meet link
    let meet_link = null;
    try {
      const { createRealMeetLink } = require('../services/meetService');
      const result = await createRealMeetLink({
        title,
        startTime: scheduledAt,
        durationMinutes: duration_minutes || 60,
        teacherEmail,
      });
      meet_link = result.meetLink;
      console.log(`✅ Meet link generated: ${meet_link}`);
    } catch (meetErr) {
      console.error('Meet link generation failed:', meetErr.message);
      meet_link = null;
    }

    const result = await pool.query(
      `INSERT INTO class_schedules
         (teacher_id, course_id, title, description, day_of_week, start_time, duration_minutes, meet_link)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teacher_id, course_id || null, title, description || '', day_of_week, start_time, duration_minutes || 60, meet_link]
    );

    // Also create today's session immediately if today matches
    const today = new Date().getDay();
    if (day_of_week.includes(today)) {
      const todayAt = new Date();
      todayAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const existing = await pool.query(
        `SELECT id FROM class_sessions WHERE schedule_id = $1 AND DATE(scheduled_at) = CURRENT_DATE`,
        [result.rows[0].id]
      );

      if (existing.rows.length === 0) {
        const session = await pool.query(
          `INSERT INTO class_sessions
             (schedule_id, teacher_id, title, meet_link, scheduled_at, duration_minutes, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
           RETURNING *`,
          [result.rows[0].id, teacher_id, title, meet_link, todayAt, duration_minutes || 60]
        );

        const { notifyAllEligibleStudents } = require('../services/notificationService');
        await notifyAllEligibleStudents(session.rows[0]);
        console.log(`Session created and students notified!`);
      }
    }

    res.status(201).json({
      message: meet_link
        ? 'Schedule created with real Google Meet link!'
        : 'Schedule created! Connect Google account to generate Meet links.',
      schedule: result.rows[0],
      meet_link,
    });
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Server error creating schedule' });
  }
};

const getUpcomingSessions = async (req, res) => {
  try {
    const user_id = req.user.id;
    const user_role = req.user.role;

    let query;
    let params;

    if (user_role === 'teacher') {
      query = `SELECT cs.*, u.full_name as teacher_name
               FROM class_sessions cs
               JOIN users u ON u.id = cs.teacher_id
               WHERE cs.teacher_id = $1
               AND cs.scheduled_at >= NOW()
               AND cs.status != 'cancelled'
               ORDER BY cs.scheduled_at ASC
               LIMIT 20`;
      params = [user_id];
    } else {
      query = `SELECT cs.*, u.full_name as teacher_name
               FROM class_sessions cs
               JOIN users u ON u.id = cs.teacher_id
               WHERE cs.scheduled_at >= NOW()
               AND cs.status != 'cancelled'
               ORDER BY cs.scheduled_at ASC
               LIMIT 20`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error fetching sessions' });
  }
};

const joinSession = async (req, res) => {
  try {
    const { id: session_id } = req.params;
    const user_id = req.user.id;

   
    const session = await pool.query(
      'SELECT * FROM class_sessions WHERE id = $1',
      [session_id]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await pool.query(
      `INSERT INTO attendance (session_id, user_id, joined_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (session_id, user_id) DO NOTHING`,
      [session_id, user_id]
    );

    res.json({
      message: 'Joined session successfully',
      meet_link: session.rows[0].meet_link,
      session: session.rows[0],
    });
  } catch (err) {
    console.error('Join session error:', err);
    res.status(500).json({ error: 'Server error joining session' });
  }
};

const leaveSession = async (req, res) => {
  try {
    const { id: session_id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `UPDATE attendance
       SET left_at = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - joined_at)) / 60
       WHERE session_id = $1 AND user_id = $2
       RETURNING *`,
      [session_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({
      message: 'Left session successfully',
      attendance: result.rows[0],
    });
  } catch (err) {
    console.error('Leave session error:', err);
    res.status(500).json({ error: 'Server error leaving session' });
  }
};

const triggerDailyGeneration = async (req, res) => {
  try {
    await generateDailySessions();
    res.json({ message: 'Daily session generation triggered successfully' });
  } catch (err) {
    console.error('Trigger generation error:', err);
    res.status(500).json({ error: 'Server error triggering generation' });
  }
};

const getMyNotifications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
};

const getSessionAttendance = async (req, res) => {
  try {
    const { id: session_id } = req.params;

    const result = await pool.query(
      `SELECT 
        a.id,
        a.joined_at,
        a.left_at,
        ROUND(a.duration_minutes::numeric, 1) as duration_minutes,
        u.full_name,
        u.email,
        cs.title as session_title,
        cs.scheduled_at,
        cs.duration_minutes as total_duration
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       JOIN class_sessions cs ON cs.id = a.session_id
       WHERE a.session_id = $1
       ORDER BY a.joined_at ASC`,
      [session_id]
    );

    res.json({
      session_id,
      total_attendees: result.rows.length,
      attendance: result.rows,
    });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ error: 'Server error fetching attendance' });
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        a.id,
        a.joined_at,
        a.left_at,
        ROUND(a.duration_minutes::numeric, 1) as duration_minutes,
        cs.title as session_title,
        cs.scheduled_at,
        cs.duration_minutes as total_duration,
        cs.meet_link,
        u.full_name as teacher_name
       FROM attendance a
       JOIN class_sessions cs ON cs.id = a.session_id
       JOIN users u ON u.id = cs.teacher_id
       WHERE a.user_id = $1
       ORDER BY a.joined_at DESC
       LIMIT 50`,
      [user_id]
    );

    const totalClasses = result.rows.length;
    const totalMinutes = result.rows.reduce((sum, r) => sum + (parseFloat(r.duration_minutes) || 0), 0);

    res.json({
      total_classes_attended: totalClasses,
      total_minutes: Math.round(totalMinutes),
      attendance: result.rows,
    });
  } catch (err) {
    console.error('Get my attendance error:', err);
    res.status(500).json({ error: 'Server error fetching attendance' });
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        a.id,
        a.joined_at,
        a.left_at,
        ROUND(a.duration_minutes::numeric, 1) as duration_minutes,
        u.full_name as student_name,
        u.email as student_email,
        cs.title as session_title,
        cs.scheduled_at,
        t.full_name as teacher_name
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       JOIN class_sessions cs ON cs.id = a.session_id
       JOIN users t ON t.id = cs.teacher_id
       ORDER BY a.joined_at DESC
       LIMIT 100`,
    );

    res.json({
      total: result.rows.length,
      attendance: result.rows,
    });
  } catch (err) {
    console.error('Get all attendance error:', err);
    res.status(500).json({ error: 'Server error fetching attendance' });
  }
};

const getTeacherAttendance = async (req, res) => {
  try {
    const teacher_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        cs.id as session_id,
        cs.title as session_title,
        cs.scheduled_at,
        cs.duration_minutes,
        COUNT(a.id) as attendee_count,
        ROUND(AVG(a.duration_minutes)::numeric, 1) as avg_duration,
        json_agg(json_build_object(
          'name', u.full_name,
          'email', u.email,
          'joined_at', a.joined_at,
          'left_at', a.left_at,
          'duration', ROUND(a.duration_minutes::numeric, 1)
        ) ORDER BY a.joined_at) as attendees
       FROM class_sessions cs
       LEFT JOIN attendance a ON a.session_id = cs.id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE cs.teacher_id = $1
       GROUP BY cs.id
       ORDER BY cs.scheduled_at DESC
       LIMIT 20`,
      [teacher_id]
    );

    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Get teacher attendance error:', err);
    res.status(500).json({ error: 'Server error fetching attendance' });
  }
};

module.exports = {
  createSchedule,
  getUpcomingSessions,
  joinSession,
  leaveSession,
  triggerDailyGeneration,
  getMyNotifications,
  getSessionAttendance,
  getMyAttendance,
  getAllAttendance,
  getTeacherAttendance,
};