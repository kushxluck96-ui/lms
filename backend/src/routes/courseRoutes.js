const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  createModule,
  createLesson,
  publishCourse,
  getTeacherCourses,
} = require('../controllers/courseController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', getAllCourses);
router.get('/my-courses', authenticate, authorize('teacher'), getTeacherCourses);
router.get('/:id', getCourseById);
router.post('/', authenticate, authorize('teacher', 'admin'), createCourse);
router.post('/:id/modules', authenticate, authorize('teacher', 'admin'), createModule);
router.post('/modules/:id/lessons', authenticate, authorize('teacher', 'admin'), createLesson);
router.patch('/:id/publish', authenticate, authorize('teacher', 'admin'), publishCourse);

module.exports = router;