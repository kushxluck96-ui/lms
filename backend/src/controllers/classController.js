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

    const result = await pool.query(
      `INSERT INTO class_schedules
         (teacher_id, course_id, title, description, day_of_week, start_time, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [teacher_id, course_id, title, description, day_of_week, start_time, duration_minutes || 60]
    );

    res.status(201).json({
      message: 'Class schedule created successfully',
      schedule: result.rows[0],
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

    const subCheck = await pool.query(
      `SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [user_id]
    );

    if (subCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Active subscription required to join classes' });
    }

    const session = await pool.query(
      'SELECT * FROM class_sessions WHERE id = $1',
      [session_id]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const user = await pool.query(
      'SELECT full_name, email FROM users WHERE id = $1',
      [user_id]
    );

    await pool.query(
      `INSERT INTO attendance (session_id, user_id, joined_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (session_id, user_id) DO NOTHING`,
      [session_id, user_id]
    );

    // Log to Google Sheets
    const { logAttendanceToSheet } = require('../services/googleService');
    await logAttendanceToSheet({
      sessionId: session_id,
      sessionTitle: session.rows[0].title,
      studentName: user.rows[0].full_name,
      studentEmail: user.rows[0].email,
      joinedAt: new Date(),
      leftAt: null,
      durationMinutes: 0,
    });

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

    const attendance = result.rows[0];

    const session = await pool.query(
      'SELECT title FROM class_sessions WHERE id = $1',
      [session_id]
    );

    const user = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [user_id]
    );

    // Update Google Sheets
    const { updateAttendanceLeave } = require('../services/googleService');
    await updateAttendanceLeave({
      sessionTitle: session.rows[0].title,
      studentEmail: user.rows[0].email,
      leftAt: attendance.left_at,
      durationMinutes: Math.round(attendance.duration_minutes),
    });

    res.json({
      message: 'Left session successfully',
      attendance,
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

module.exports = {
  createSchedule,
  getUpcomingSessions,
  joinSession,
  leaveSession,
  triggerDailyGeneration,
  getMyNotifications,
};