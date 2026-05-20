// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check Bearer token format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get active user from database
    const userResult = await pool.query(
      `SELECT id, email, full_name, role
       FROM users
       WHERE id = $1 AND is_active = true`,
      [decoded.id]
    );

    // User not found
    if (userResult.rows.length === 0) {
      return res.status(403).json({
        error: 'User not found or inactive'
      });
    }

    // Attach user to request
    req.user = userResult.rows[0];

    next();

  } catch (err) {
    console.error('Auth Middleware Error:', err.message);

    // Token expired
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired'
      });
    }

    // Invalid token
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
};

const VALID_ROLES = [
  'student',
  'teacher',
  'admin',
  'institute_admin'
];

const authorize = (...allowedRoles) => {
  return (req, res, next) => {

    // User missing
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }

    // Invalid role in DB
    if (!VALID_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Invalid role'
      });
    }

    // Role permission check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Only ${allowedRoles.join(', ')} allowed.`
      });
    }

    next();
  };
};



module.exports = { authenticate, authorize };