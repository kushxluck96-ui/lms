const cron = require('node-cron');
const pool = require('../config/database');
const { notifyAllEligibleStudents } = require('./notificationService');
const { createCalendarEvent } = require('./googleService');

const generateDailySessions = async () => {
  console.log('Running daily session generator...');

  try {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const schedules = await pool.query(
      `SELECT cs.*, u.email as teacher_email, u.full_name as teacher_name
       FROM class_schedules cs
       JOIN users u ON u.id = cs.teacher_id
       WHERE cs.is_active = true
       AND cs.day_of_week @> ARRAY[$1]::integer[]`,
      [dayOfWeek]
    );

    console.log(`Found ${schedules.rows.length} schedules for today`);

    for (const schedule of schedules.rows) {
      const existingSession = await pool.query(
        `SELECT id FROM class_sessions
         WHERE schedule_id = $1
         AND DATE(scheduled_at) = CURRENT_DATE`,
        [schedule.id]
      );

      if (existingSession.rows.length > 0) {
        console.log(`Session already exists for schedule ${schedule.id}`);
        continue;
      }

      const scheduledAt = new Date();
      const [hours, minutes] = schedule.start_time.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Try real Google Calendar
      let meetLink = null;

      try {
        console.log('Attempting Google Calendar event creation...');
        const calendarEvent = await createCalendarEvent({
          title: schedule.title,
          description: schedule.description || `Live class by ${schedule.teacher_name}`,
          startTime: scheduledAt,
          durationMinutes: schedule.duration_minutes,
          teacherEmail: schedule.teacher_email,
        });
        meetLink = calendarEvent.meetLink;
        console.log(`Real Meet link created: ${meetLink}`);
      } catch (googleErr) {
        console.error('Google Calendar failed:', googleErr.message);
        console.error('Full error:', googleErr.errors || googleErr.response?.data);
        meetLink = `https://meet.google.com/fallback-${Date.now()}`;
      }

      const session = await pool.query(
        `INSERT INTO class_sessions
           (schedule_id, teacher_id, title, meet_link, scheduled_at, duration_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
         RETURNING *`,
        [
          schedule.id,
          schedule.teacher_id,
          schedule.title,
          meetLink,
          scheduledAt,
          schedule.duration_minutes,
        ]
      );

      console.log(`Created session: ${session.rows[0].title}`);
      console.log(`Meet link stored: ${session.rows[0].meet_link}`);
      await notifyAllEligibleStudents(session.rows[0]);
    }

    console.log('Daily session generation complete!');
  } catch (err) {
    console.error('Cron job error:', err);
  }
};

const startCronJobs = () => {
  cron.schedule('0 6 * * *', generateDailySessions, {
    timezone: 'Asia/Kathmandu',
  });

  cron.schedule('0 0 * * *', async () => {
    console.log('Running subscription expiry check...');
    try {
      const expired = await pool.query(
        `UPDATE subscriptions
         SET status = 'expired', updated_at = NOW()
         WHERE status = 'active'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
         RETURNING user_id`
      );

      console.log(`Expired ${expired.rows.length} subscriptions`);

      const { createNotification } = require('./notificationService');
      for (const row of expired.rows) {
        await createNotification(
          row.user_id,
          'Subscription Expired',
          'Your subscription has expired. Please renew to continue accessing premium content.',
          'warning'
        );
      }
    } catch (err) {
      console.error('Subscription expiry check error:', err);
    }
  }, {
    timezone: 'Asia/Kathmandu',
  });

  console.log('Cron jobs started successfully');
};

module.exports = { startCronJobs, generateDailySessions };