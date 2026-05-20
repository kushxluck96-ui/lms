const app = require('./app');
const { startCronJobs } = require('./services/cronService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 LMS Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  startCronJobs();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down');
  process.exit(0);
});