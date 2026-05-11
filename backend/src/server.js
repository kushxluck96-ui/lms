const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const classRoutes = require('./routes/classRoutes');
const adminRoutes = require('./routes/adminRoutes');
const googleRoutes = require('./routes/googleRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// ====================== CORS CONFIG ======================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://lms-mocha-nine.vercel.app',
  'https://lms-production-691e.up.railway.app'   // ← Your Railway domain
].filter(Boolean);

console.log('✅ Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
// ========================================================

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route (important for Railway)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LMS API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/google', googleRoutes);
app.use('/api/v1/payments', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 LMS API Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health check available at /health`);
});

// Graceful shutdown (recommended for Railway)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;   // Keep this if you use it for testing