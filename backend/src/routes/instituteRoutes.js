const express = require('express');
const router = express.Router();
const {
  createInstitute,
  getMyInstitute,
  inviteMember,
  acceptInvitation,
  removeMember,
  getAnalytics,
} = require('../controllers/instituteController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, createInstitute);
router.get('/my', authenticate, getMyInstitute);
router.post('/invite', authenticate, inviteMember);
router.post('/join/:token', authenticate, acceptInvitation);
router.delete('/members/:user_id', authenticate, removeMember);
router.get('/analytics', authenticate, getAnalytics);

module.exports = router;