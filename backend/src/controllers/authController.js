const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

// Generate Tokens - Includes email (Important for Google Meet)
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email,        // ← Required for createMeetLink
      role: user.role, 
      full_name: user.full_name 
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const register = async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const allowedRole = ['student', 'teacher', 'institute_admin'].includes(role) ? role : 'student';

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_at`,
      [email, password_hash, full_name, allowedRole]
    );

    const user = result.rows[0];

    // Auto create demo subscription for students
    if (allowedRole === 'student') {
      await pool.query(
        `INSERT INTO subscriptions (user_id, plan, status) VALUES ($1, 'demo', 'active')`,
        [user.id]
      );
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.created_at,
              s.plan, s.status as subscription_status, s.expires_at
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
const updateProfile = async (req, res) => {
  try {
    const { full_name } = req.body;
    if (!full_name) return res.status(400).json({ error: 'Full name is required' });

    const result = await pool.query(
      `UPDATE users SET full_name = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, email, full_name, role`,
      [full_name, req.user.id]
    );

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    const password_hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};