const pool = require('../config/database');

const createNotification = async (user_id, title, message, type = 'info') => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [user_id, title, message, type]
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
};

const notifyAllEligibleStudents = async (session) => {
  try {
    // Get all students with active paid or demo subscriptions
    const students = await pool.query(
      `SELECT DISTINCT u.id, u.email, u.full_name
       FROM users u
       JOIN subscriptions s ON s.user_id = u.id
       WHERE u.role = 'student'
       AND s.status = 'active'`
    );

    const sessionTime = new Date(session.scheduled_at).toLocaleString('en-US', {
      timeZone: 'Asia/Kathmandu',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    for (const student of students.rows) {
      await createNotification(
        student.id,
        `New Live Class: ${session.title}`,
        `A new live class has been scheduled for ${sessionTime}. Join link: ${session.meet_link || 'Link will be available soon'}`,
        'class'
      );
    }

    console.log(`Notified ${students.rows.length} students about session: ${session.title}`);
  } catch (err) {
    console.error('Notify students error:', err);
  }
};

module.exports = { createNotification, notifyAllEligibleStudents };