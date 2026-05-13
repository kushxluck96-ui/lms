const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? `${process.env.BACKEND_URL}/api/v1/google/auth/callback`
  : 'http://localhost:5000/api/v1/google/auth/callback';



const getOAuthClient = () => {
  let creds;
  if (process.env.GOOGLE_CREDENTIALS) {
    creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else if (fs.existsSync(CREDENTIALS_PATH)) {
    creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  } else {
    throw new Error('Google credentials not found');
  }
  const { client_id, client_secret } = creds.installed || creds.web;
  return new google.auth.OAuth2(client_id, client_secret, CALLBACK_URL);
};

// GET /api/v1/google/auth/url
router.get('/auth/url', (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
    });
    res.json({ success: true, url });
  } catch (err) {
    console.error('Auth URL error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/google/auth/callback
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    // Save token
    process.env.GOOGLE_TOKEN = JSON.stringify(tokens);
    try {
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    } catch (e) {
      console.log('Running on Railway - token saved to memory');
    }

    console.log('✅ Google OAuth token saved!');
    res.send(`
      <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f0fdf4">
          <div style="background:white;border-radius:16px;padding:40px;max-width:400px;margin:auto">
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2 style="color:#16a34a">Google Account Connected!</h2>
            <p style="color:#6b7280">You can close this tab and return to Smart LMS.</p>
          </div>
          <script>setTimeout(() => window.close(), 3000)</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Callback error:', err.message);
    res.status(500).send(`❌ Failed: ${err.message}`);
  }
});

router.get('/auth/status', (req, res) => {
  const connected = !!(process.env.GOOGLE_TOKEN || fs.existsSync(TOKEN_PATH));
  res.json({ connected });
});

// GET /api/v1/google/auth/status
router.get('/auth/status', (req, res) => {
  const connected = fs.existsSync(TOKEN_PATH);
  res.json({ connected });
});

module.exports = router;