const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../../token.json');

const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? `${process.env.BACKEND_URL}/api/v1/google/auth/callback`
  : 'http://localhost:5000/api/v1/google/auth/callback';

const getCredentials = () => {
  if (process.env.GOOGLE_CREDENTIALS) return JSON.parse(process.env.GOOGLE_CREDENTIALS);
  if (fs.existsSync(CREDENTIALS_PATH)) return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  throw new Error('Google credentials not found');
};

const getTokens = () => {
  if (process.env.GOOGLE_TOKEN) return JSON.parse(process.env.GOOGLE_TOKEN);
  if (fs.existsSync(TOKEN_PATH)) return JSON.parse(fs.readFileSync(TOKEN_PATH));
  throw new Error('Google account not connected. Please connect from teacher dashboard.');
};

const createRealMeetLink = async ({ title, startTime, durationMinutes }) => {
  const creds = getCredentials();
  const tokens = getTokens();

  const { client_id, client_secret } = creds.installed || creds.web;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, CALLBACK_URL);
  oauth2Client.setCredentials(tokens);

  oauth2Client.on('tokens', (newTokens) => {
    const updated = { ...tokens, ...newTokens };
    process.env.GOOGLE_TOKEN = JSON.stringify(updated);
    try { fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated)); } catch (e) {}
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + (durationMinutes || 60));

  const event = {
    summary: title,
    description: 'Smart LMS Live Class — Auto generated',
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

  if (!meetLink) throw new Error('Meet link not generated');

  console.log(`✅ Real Meet link: ${meetLink}`);
  return { meetLink, eventId: response.data.id, htmlLink: response.data.htmlLink };
};

module.exports = { createRealMeetLink };