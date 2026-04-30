const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../../google-credentials.json'),
  scopes: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const getCalendar = async () => {
  const client = await auth.getClient();
  return google.calendar({ version: 'v3', auth: client });
};

const getSheets = async () => {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
};

// Create a Google Calendar event with Meet link
const createCalendarEvent = async ({ title, description, startTime, durationMinutes }) => {
  try {
    const calendar = await getCalendar();

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    // Generate a proper Google Meet code (3-4-3 lowercase letters only)
    const generateMeetCode = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz';
      const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `${rand(3)}-${rand(4)}-${rand(3)}`;
    };

    const meetCode = generateMeetCode();
    const meetLink = `https://meet.google.com/${meetCode}`;

    const event = {
      summary: title,
      description: `${description || 'Smart LMS Live Class'}\n\nJoin via Google Meet: ${meetLink}`,
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Asia/Kathmandu',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Kathmandu',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
    });

    console.log(`Calendar event created: ${response.data.id}`);
    console.log(`Meet link: ${meetLink}`);
    console.log(`Calendar link: ${response.data.htmlLink}`);

    return {
      eventId: response.data.id,
      meetLink,
      htmlLink: response.data.htmlLink,
    };
  } catch (err) {
    console.error('Google Calendar error:', err.message);
    throw err;
  }
};
// Log attendance to Google Sheets
const logAttendanceToSheet = async ({ sessionId, sessionTitle, studentName, studentEmail, joinedAt, leftAt, durationMinutes }) => {
  try {
    const sheets = await getSheets();

    const date = new Date(joinedAt).toLocaleDateString('en-US', {
      timeZone: 'Asia/Kathmandu',
    });

    const joinedAtFormatted = new Date(joinedAt).toLocaleString('en-US', {
      timeZone: 'Asia/Kathmandu',
    });

    const leftAtFormatted = leftAt
      ? new Date(leftAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })
      : 'Still in class';

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:H',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          sessionId,
          sessionTitle,
          studentName,
          studentEmail,
          joinedAtFormatted,
          leftAtFormatted,
          durationMinutes || 0,
          date,
        ]],
      },
    });

    console.log(`Attendance logged to sheet for: ${studentName}`);
  } catch (err) {
    console.error('Google Sheets error:', err.message);
    // Don't throw — sheet logging failure shouldn't break join flow
  }
};

// Update left_at in sheet when student leaves
const updateAttendanceLeave = async ({ sessionTitle, studentEmail, leftAt, durationMinutes }) => {
  try {
    const sheets = await getSheets();

    // Find the row with matching session and email
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:H',
    });

    const rows = response.data.values || [];
    let targetRow = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === sessionTitle && rows[i][3] === studentEmail && rows[i][5] === 'Still in class') {
        targetRow = i + 1; // Sheets is 1-indexed
        break;
      }
    }

    if (targetRow > 0) {
      const leftAtFormatted = new Date(leftAt).toLocaleString('en-US', {
        timeZone: 'Asia/Kathmandu',
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `Sheet1!F${targetRow}:G${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[leftAtFormatted, durationMinutes]],
        },
      });

      console.log(`Attendance updated for: ${studentEmail}`);
    }
  } catch (err) {
    console.error('Google Sheets update error:', err.message);
  }
};

module.exports = {
  createCalendarEvent,
  logAttendanceToSheet,
  updateAttendanceLeave,
};