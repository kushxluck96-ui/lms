const express = require('express');
const router = express.Router();
const {
  markLessonComplete,
  getCourseProgress,
  getMyStats,
} = require('../controllers/progressController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/complete', authenticate, authorize('student'), markLessonComplete);
router.get('/course/:course_id', authenticate, getCourseProgress);
router.get('/my-stats', authenticate, getMyStats);

module.exports = router;