const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/users', authenticate, authorize('admin'), getAllUsers);

module.exports = router;