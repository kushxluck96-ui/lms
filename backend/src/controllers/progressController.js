const pool = require('../config/database');

const markLessonComplete = async (req, res) => {
  try {
    const { lesson_id, watch_duration_sec } = req.body;
    const user_id = req.user.id;

    if (!lesson_id) {
      return res.status(400).json({ error: 'lesson_id is required' });
    }

    // Check subscription
    const subCheck = await pool.query(
      `SELECT id FROM subscriptions 
       WHERE user_id = $1 AND status = 'active'`,
      [user_id]
    );

    if (subCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Active subscription required' });
    }

    // Check lesson exists
    const lessonCheck = await pool.query(
      'SELECT id, order_index, module_id FROM lessons WHERE id = $1',
      [lesson_id]
    );

    if (lessonCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    const lesson = lessonCheck.rows[0];

    // Check previous lesson is completed (sequential unlock)
    if (lesson.order_index > 1) {
      const prevLesson = await pool.query(
        `SELECT l.id FROM lessons l
         LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
         WHERE l.module_id = $2 AND l.order_index = $3`,
        [user_id, lesson.module_id, lesson.order_index - 1]
      );

      if (prevLesson.rows.length > 0) {
        const prevProgress = await pool.query(
          `SELECT completed FROM user_progress 
           WHERE user_id = $1 AND lesson_id = $2`,
          [user_id, prevLesson.rows[0].id]
        );

        if (prevProgress.rows.length === 0 || !prevProgress.rows[0].completed) {
          return res.status(403).json({
            error: 'Please complete the previous lesson first',
          });
        }
      }
    }

    // Upsert progress record
    const result = await pool.query(
      `INSERT INTO user_progress (user_id, lesson_id, completed, completed_at, watch_duration_sec, last_watched_at)
       VALUES ($1, $2, true, NOW(), $3, NOW())
       ON CONFLICT (user_id, lesson_id)
       DO UPDATE SET
         completed = true,
         completed_at = COALESCE(user_progress.completed_at, NOW()),
         watch_duration_sec = GREATEST(user_progress.watch_duration_sec, $3),
         last_watched_at = NOW()
       RETURNING *`,
      [user_id, lesson_id, watch_duration_sec || 0]
    );

    res.json({
      message: 'Lesson marked as complete',
      progress: result.rows[0],
    });
  } catch (err) {
    console.error('Mark complete error:', err);
    res.status(500).json({ error: 'Server error tracking progress' });
  }
};

const getCourseProgress = async (req, res) => {
  try {
    const { course_id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        l.id as lesson_id,
        l.title as lesson_title,
        l.order_index,
        l.type,
        l.duration_minutes,
        m.title as module_title,
        m.order_index as module_order,
        COALESCE(up.completed, false) as completed,
        up.completed_at,
        up.watch_duration_sec
       FROM courses c
       JOIN modules m ON m.course_id = c.id
       JOIN lessons l ON l.module_id = m.id
       LEFT JOIN user_progress up ON up.lesson_id = l.id AND up.user_id = $1
       WHERE c.id = $2
       ORDER BY m.order_index, l.order_index`,
      [user_id, course_id]
    );

    const totalLessons = result.rows.length;
    const completedLessons = result.rows.filter(r => r.completed).length;
    const progressPercent = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    res.json({
      course_id,
      total_lessons: totalLessons,
      completed_lessons: completedLessons,
      progress_percent: progressPercent,
      lessons: result.rows,
    });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Server error fetching progress' });
  }
};

const getMyStats = async (req, res) => {
  try {
    const user_id = req.user.id;

    const stats = await pool.query(
      `SELECT
        COUNT(DISTINCT up.lesson_id) FILTER (WHERE up.completed = true) as total_lessons_completed,
        COUNT(DISTINCT m.course_id) FILTER (WHERE up.completed = true) as courses_in_progress,
        COALESCE(SUM(up.watch_duration_sec), 0) as total_watch_seconds
       FROM user_progress up
       JOIN lessons l ON l.id = up.lesson_id
       JOIN modules m ON m.id = l.module_id
       WHERE up.user_id = $1`,
      [user_id]
    );

    const sub = await pool.query(
      `SELECT plan, status, expires_at FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    res.json({
      stats: {
        ...stats.rows[0],
        total_watch_hours: Math.round(stats.rows[0].total_watch_seconds / 3600 * 10) / 10,
      },
      subscription: sub.rows[0] || null,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
};

module.exports = { markLessonComplete, getCourseProgress, getMyStats };