const pool = require('../config/database');
const crypto = require('crypto');

// Create institute
const createInstitute = async (req, res) => {
  try {
    console.log('REQ USER:', req.user);
    console.log('REQ BODY:', req.body);

    const { name, email, phone, address, website } = req.body;
    const user_id = req.user.id;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email are required',
      });
    }

    const existing = await pool.query(
      'SELECT id FROM institutes WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Institute with this email already exists',
      });
    }

    const result = await pool.query(
      `INSERT INTO institutes
      (name, email, phone, address, website)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [name, email, phone, address, website]
    );

    console.log('INSTITUTE CREATED:', result.rows[0]);

    const institute = result.rows[0];

    await pool.query(
      `UPDATE users
       SET institute_id = $1,
           role = 'institute_admin'
       WHERE id = $2`,
      [institute.id, user_id]
    );

    console.log('USER UPDATED');

    res.status(201).json({
      message: 'Institute created successfully',
      institute,
    });

  } catch (err) {
    console.error('CREATE INSTITUTE ERROR:', err);

    res.status(500).json({
      error: err.message,
    });
  }
};

// Get institute details
const getMyInstitute = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT institute_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user.rows[0]?.institute_id) {
  return res.status(200).json({
    institute: null,
    teachers: [],
    students: [],
    courses: [],
    stats: {
      total_teachers: 0,
      total_students: 0,
      total_courses: 0,
      total_sessions: 0,
      avg_duration: 0,
    },
  });
}

    const institute_id = user.rows[0].institute_id;

    const result = await pool.query(
      'SELECT * FROM institutes WHERE id = $1',
      [institute_id]
    );

    const teachers = await pool.query(
      `SELECT id, full_name, email, created_at FROM users
       WHERE institute_id = $1 AND role = 'teacher'`,
      [institute_id]
    );

    const students = await pool.query(
      `SELECT id, full_name, email, created_at FROM users
       WHERE institute_id = $1 AND role = 'student'`,
      [institute_id]
    );

    const courses = await pool.query(
      `SELECT c.id, c.title, c.is_published, c.created_at,
              u.full_name as teacher_name,
              COUNT(DISTINCT m.id) as module_count,
              COUNT(DISTINCT l.id) as lesson_count
       FROM courses c
       JOIN users u ON u.id = c.teacher_id
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE u.institute_id = $1
       GROUP BY c.id, u.full_name
       ORDER BY c.created_at DESC`,
      [institute_id]
    );

    const attendance = await pool.query(
      `SELECT COUNT(*) as total_sessions,
              COALESCE(AVG(a.duration_minutes), 0) as avg_duration
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE u.institute_id = $1`,
      [institute_id]
    );

    res.json({
      institute: result.rows[0],
      teachers: teachers.rows,
      students: students.rows,
      courses: courses.rows,
      stats: {
        total_teachers: teachers.rows.length,
        total_students: students.rows.length,
        total_courses: courses.rows.length,
        total_sessions: attendance.rows[0].total_sessions,
        avg_duration: Math.round(attendance.rows[0].avg_duration),
      },
    });
  } catch (err) {
    console.error('Get institute error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Invite teacher or student
const inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const user = await pool.query(
      'SELECT institute_id FROM users WHERE id = $1',
      [req.user.id]
    );

    const institute_id = user.rows[0]?.institute_id;
    if (!institute_id) {
      return res.status(404).json({ error: 'No institute found' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    await pool.query(
      `INSERT INTO institute_invitations (institute_id, email, role, token)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [institute_id, email, role || 'student', token]
    );

    const institute = await pool.query(
      'SELECT name FROM institutes WHERE id = $1',
      [institute_id]
    );

    const inviteLink = `${process.env.FRONTEND_URL}/join/${token}`;

    res.json({
      message: 'Invitation created',
      invite_link: inviteLink,
      email,
      role,
      institute: institute.rows[0]?.name,
    });
  } catch (err) {
    console.error('Invite member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Accept invitation
const acceptInvitation = async (req, res) => {
  try {
    const { token } = req.params;
    const user_id = req.user.id;

    const invitation = await pool.query(
      `SELECT * FROM institute_invitations
       WHERE token = $1 AND accepted = false AND expires_at > NOW()`,
      [token]
    );

    if (invitation.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const inv = invitation.rows[0];

    // Link user to institute
    await pool.query(
      `UPDATE users SET institute_id = $1, role = $2 WHERE id = $3`,
      [inv.institute_id, inv.role, user_id]
    );

    // Mark invitation as accepted
    await pool.query(
      'UPDATE institute_invitations SET accepted = true WHERE token = $1',
      [token]
    );

    const institute = await pool.query(
      'SELECT name FROM institutes WHERE id = $1',
      [inv.institute_id]
    );

    res.json({
      message: `Successfully joined ${institute.rows[0]?.name}`,
      institute_id: inv.institute_id,
      role: inv.role,
    });
  } catch (err) {
    console.error('Accept invitation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove member
const removeMember = async (req, res) => {
  try {
    const { user_id } = req.params;
    const admin = await pool.query(
      'SELECT institute_id FROM users WHERE id = $1',
      [req.user.id]
    );

    const institute_id = admin.rows[0]?.institute_id;

    await pool.query(
      `UPDATE users SET institute_id = NULL
       WHERE id = $1 AND institute_id = $2`,
      [user_id, institute_id]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get institute analytics
const getAnalytics = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT institute_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const institute_id = user.rows[0]?.institute_id;

    if (!institute_id) {
      return res.status(404).json({ error: 'No institute found' });
    }

    // Daily attendance last 7 days
    const dailyAttendance = await pool.query(
      `SELECT DATE(a.joined_at) as date, COUNT(*) as count
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       WHERE u.institute_id = $1
       AND a.joined_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(a.joined_at)
       ORDER BY date ASC`,
      [institute_id]
    );

    // Top courses by enrollment
    const topCourses = await pool.query(
      `SELECT c.title, COUNT(DISTINCT up.user_id) as students,
              ROUND(AVG(CASE WHEN up.completed THEN 100 ELSE 0 END)) as completion_rate
       FROM courses c
       JOIN users teacher ON teacher.id = c.teacher_id
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       LEFT JOIN user_progress up ON up.lesson_id = l.id
       WHERE teacher.institute_id = $1
       GROUP BY c.id
       ORDER BY students DESC
       LIMIT 5`,
      [institute_id]
    );

    // Teacher performance
    const teacherStats = await pool.query(
      `SELECT u.full_name, COUNT(DISTINCT c.id) as courses,
              COUNT(DISTINCT cs.id) as sessions
       FROM users u
       LEFT JOIN courses c ON c.teacher_id = u.id
       LEFT JOIN class_sessions cs ON cs.teacher_id = u.id
       WHERE u.institute_id = $1 AND u.role = 'teacher'
       GROUP BY u.id
       ORDER BY sessions DESC`,
      [institute_id]
    );

    res.json({
      daily_attendance: dailyAttendance.rows,
      top_courses: topCourses.rows,
      teacher_stats: teacherStats.rows,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createInstitute,
  getMyInstitute,
  inviteMember,
  acceptInvitation,
  removeMember,
  getAnalytics,
};