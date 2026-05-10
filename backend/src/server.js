const app = require('./app');
const { startCronJobs } = require('./services/cronService');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`LMS Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);

  try {
    startCronJobs();
    console.log("Cron jobs started");
  } catch (err) {
    console.error("Cron failed to start:", err.message);
  }
});