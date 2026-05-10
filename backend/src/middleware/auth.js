// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user with email (Important for Google Meet)
    const userResult = await pool.query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    req.user = userResult.rows[0];   // Contains id, email, full_name, role

    next();
  } catch (err) {
    console.error('Auth error:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Only ${allowedRoles.join(', ')} allowed.` 
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };