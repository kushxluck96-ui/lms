const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');
const CALLBACK_URL = 'http://localhost:5000/api/v1/google/auth/callback';

const getOAuthClient = () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json not found in backend folder');
  }
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
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
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('✅ Google OAuth token saved!');

    res.send(`
      <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#f0fdf4">
          <div style="background:white;border-radius:16px;padding:40px;max-width:400px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,0.1)">
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2 style="color:#16a34a;margin-bottom:8px">Google Account Connected!</h2>
            <p style="color:#6b7280">You can close this tab and return to Smart LMS dashboard.</p>
            <p style="color:#9ca3af;font-size:13px;margin-top:16px">This tab will close automatically...</p>
          </div>
          <script>setTimeout(() => window.close(), 3000)</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Callback error:', err.message);
    res.status(500).send(`
      <html>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:60px;background:#fef2f2">
          <div style="background:white;border-radius:16px;padding:40px;max-width:400px;margin:auto">
            <div style="font-size:48px;margin-bottom:16px">❌</div>
            <h2 style="color:#dc2626">Connection Failed</h2>
            <p style="color:#6b7280">${err.message}</p>
            <p style="color:#6b7280">Please close this tab and try again.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// GET /api/v1/google/auth/status
router.get('/auth/status', (req, res) => {
  const connected = fs.existsSync(TOKEN_PATH);
  res.json({ connected });
});

module.exports = router;