const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/classController');

const { authenticate, authorize } = require('../middleware/auth');

router.post('/schedules', authenticate, authorize('teacher', 'admin'), createSchedule);
router.get('/sessions', authenticate, getUpcomingSessions);
router.post('/sessions/:id/join', authenticate, authorize('student'), joinSession);
router.post('/sessions/:id/leave', authenticate, authorize('student'), leaveSession);
router.post('/trigger-generation', authenticate, authorize('admin', 'teacher'), triggerDailyGeneration);
router.get('/notifications', authenticate, getMyNotifications);

// Attendance routes
router.get('/sessions/:id/attendance', authenticate, authorize('teacher', 'admin'), getSessionAttendance);
router.get('/my-attendance', authenticate, authorize('student'), getMyAttendance);
router.get('/all-attendance', authenticate, authorize('admin'), getAllAttendance);
router.get('/teacher-attendance', authenticate, authorize('teacher'), getTeacherAttendance);

module.exports = router;