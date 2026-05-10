const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const TOKEN_PATH = path.join(__dirname, '../../token.json');
const CREDS_PATH = path.join(__dirname, '../../credentials.json');

const getOAuthClient = () => {
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH));
  const { client_id, client_secret, redirect_uris } = creds.installed || creds.web;
  return new google.auth.OAuth2(client_id, client_secret, 'http://localhost:5000/api/v1/google/auth/callback');
};

const getAuthUrl = async (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
    res.json({ success: true, url });
  } catch (err) {
    console.error('Auth URL error:', err);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
};

const handleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Google OAuth token saved!');
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:50px">
          <h2>✅ Google Account Connected!</h2>
          <p>You can close this tab and return to the dashboard.</p>
          <script>setTimeout(() => window.close(), 3000)</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).send('Authentication failed. Please try again.');
  }
};

const createMeetLink = async ({ title, startTime, durationMinutes }) => {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Google account not connected. Please connect first.');
  }
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error('OAuth credentials not found.');
  }

  const oauth2Client = getOAuthClient();
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oauth2Client.setCredentials(tokens);

  // Refresh token if expired
  oauth2Client.on('tokens', (newTokens) => {
    const updated = { ...tokens, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated));
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + durationMinutes);

  const event = {
    summary: title,
    description: 'Smart LMS Live Class - Auto generated',
    start: {
      dateTime: new Date(startTime).toISOString(),
      timeZone: 'Asia/Kathmandu',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Kathmandu',
    },
    conferenceData: {
      createRequest: {
        requestId: `lms-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
  });

  const meetLink =
    response.data.hangoutLink ||
    response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video'
    )?.uri;

  console.log(`Real Meet link created: ${meetLink}`);

  return {
    meetLink,
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
  };
};

const checkConnection = async (req, res) => {
  const connected = fs.existsSync(TOKEN_PATH);
  res.json({ connected });
};

module.exports = { getAuthUrl, handleCallback, createMeetLink, checkConnection };