const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  esewaSuccess,
  khaltiSuccess,
  getSubscription,
  getPaymentHistory,
  getAllPayments,
} = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/initiate', authenticate, authorize('student'), initiatePayment);
router.get('/esewa/success', esewaSuccess);
router.get('/khalti/success', khaltiSuccess);
router.get('/subscription', authenticate, getSubscription);
router.get('/history', authenticate, getPaymentHistory);
router.get('/admin/all', authenticate, authorize('admin'), getAllPayments);

module.exports = router;