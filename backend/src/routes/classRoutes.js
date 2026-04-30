const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getUpcomingSessions,
  joinSession,
  leaveSession,
  triggerDailyGeneration,
  getMyNotifications,
} = require('../controllers/classController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/schedules', authenticate, authorize('teacher', 'admin'), createSchedule);
router.get('/sessions', authenticate, getUpcomingSessions);
router.post('/sessions/:id/join', authenticate, authorize('student'), joinSession);
router.post('/sessions/:id/leave', authenticate, authorize('student'), leaveSession);
router.post('/trigger-generation', authenticate, authorize('admin', 'teacher'), triggerDailyGeneration);
router.get('/notifications', authenticate, getMyNotifications);

module.exports = router;