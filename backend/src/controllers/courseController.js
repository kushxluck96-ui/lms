const pool = require('../config/database');

const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const teacher_id = req.user.id;

    if (!title) {
      return res.status(400).json({ error: 'Course title is required' });
    }

    const result = await pool.query(
      `INSERT INTO courses (title, description, teacher_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description, teacher_id]
    );

    res.status(201).json({
      message: 'Course created successfully',
      course: result.rows[0],
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Server error creating course' });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.thumbnail_url, c.is_published,
              c.created_at, u.full_name as teacher_name,
              COUNT(DISTINCT m.id) as module_count,
              COUNT(DISTINCT l.id) as lesson_count
       FROM courses c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE c.is_published = true
       GROUP BY c.id, u.full_name
       ORDER BY c.created_at DESC`
    );

    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Get courses error:', err);
    res.status(500).json({ error: 'Server error fetching courses' });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const courseResult = await pool.query(
      `SELECT c.*, u.full_name as teacher_name
       FROM courses c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.id = $1`,
      [id]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const modulesResult = await pool.query(
      `SELECT m.id, m.title, m.order_index,
              json_agg(
                json_build_object(
                  'id', l.id,
                  'title', l.title,
                  'type', l.type,
                  'duration_minutes', l.duration_minutes,
                  'order_index', l.order_index,
                  'is_free_preview', l.is_free_preview
                ) ORDER BY l.order_index
              ) FILTER (WHERE l.id IS NOT NULL) as lessons
       FROM modules m
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE m.course_id = $1
       GROUP BY m.id
       ORDER BY m.order_index`,
      [id]
    );

    res.json({
      course: courseResult.rows[0],
      modules: modulesResult.rows,
    });
  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({ error: 'Server error fetching course' });
  }
};

const createModule = async (req, res) => {
  try {
    const { id: course_id } = req.params;
    const { title, order_index } = req.body;

    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
      [course_id, req.user.id]
    );

    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to modify this course' });
    }

    const result = await pool.query(
      `INSERT INTO modules (course_id, title, order_index)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [course_id, title, order_index || 0]
    );

    res.status(201).json({
      message: 'Module created successfully',
      module: result.rows[0],
    });
  } catch (err) {
    console.error('Create module error:', err);
    res.status(500).json({ error: 'Server error creating module' });
  }
};

const createLesson = async (req, res) => {
  try {
    const { id: module_id } = req.params;
    const { title, type, content_url, duration_minutes, order_index, is_free_preview } = req.body;

    const moduleCheck = await pool.query(
      `SELECT m.id FROM modules m
       JOIN courses c ON c.id = m.course_id
       WHERE m.id = $1 AND c.teacher_id = $2`,
      [module_id, req.user.id]
    );

    if (moduleCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to modify this module' });
    }

    const result = await pool.query(
      `INSERT INTO lessons (module_id, title, type, content_url, duration_minutes, order_index, is_free_preview)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [module_id, title, type || 'video', content_url, duration_minutes || 0, order_index || 0, is_free_preview || false]
    );

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson: result.rows[0],
    });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Server error creating lesson' });
  }
};

const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE courses SET is_published = true, updated_at = NOW()
       WHERE id = $1 AND teacher_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized or course not found' });
    }

    res.json({ message: 'Course published successfully', course: result.rows[0] });
  } catch (err) {
    console.error('Publish course error:', err);
    res.status(500).json({ error: 'Server error publishing course' });
  }
};

const getTeacherCourses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(DISTINCT m.id) as module_count, COUNT(DISTINCT l.id) as lesson_count
       FROM courses c
       LEFT JOIN modules m ON m.course_id = c.id
       LEFT JOIN lessons l ON l.module_id = m.id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Get teacher courses error:', err);
    res.status(500).json({ error: 'Server error fetching courses' });
  }
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  createModule,
  createLesson,
  publishCourse,
  getTeacherCourses,
};