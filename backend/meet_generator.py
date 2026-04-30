import sys
import json
import datetime
import os
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# 🔐 Config
SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_FILE = 'token.json'          # Will be created after first login
CREDENTIALS_FILE = 'credentials.json'  # Download from Google Cloud Console
CALENDAR_ID = 'kushalshrestha76@gmail.com'


def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)   # Opens browser for login
        
        # Save the credentials for next time
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
    
    return creds


def create_meet_link(title, start_iso, end_iso):
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)

    event = {
        'summary': title,
        'description': 'Smart LMS Live Class',
        'start': {
            'dateTime': start_iso,
            'timeZone': 'Asia/Kathmandu'
        },
        'end': {
            'dateTime': end_iso,
            'timeZone': 'Asia/Kathmandu'
        },
        'conferenceData': {
            'createRequest': {
                'requestId': f"lms-{int(datetime.datetime.now().timestamp())}",
                'conferenceSolutionKey': {
                    'type': 'hangoutsMeet'
                }
            }
        }
    }

    result = service.events().insert(
        calendarId=CALENDAR_ID,
        body=event,
        conferenceDataVersion=1,
        sendUpdates='none'   # optional
    ).execute()

    # Extract Meet link
    meet_link = None
    if 'hangoutLink' in result:
        meet_link = result['hangoutLink']
    elif 'conferenceData' in result and 'entryPoints' in result['conferenceData']:
        for entry in result['conferenceData']['entryPoints']:
            if entry.get('entryPointType') == 'video':
                meet_link = entry.get('uri')
                break

    print(json.dumps({
        'success': True,
        'meet_link': meet_link,
        'event_id': result.get('id'),
        'calendar_link': result.get('htmlLink')
    }))


if __name__ == '__main__':
    try:
        data = json.load(sys.stdin)
        create_meet_link(
            data['title'],
            data['start'],
            data['end']
        )
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))