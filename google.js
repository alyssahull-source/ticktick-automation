const { google } = require('googleapis')
const fs = require('fs')

const REDIRECT_URI = 'https://ticktick-automation.onrender.com/google/callback'

console.log('GOOGLE CLIENT ID:', process.env.GOOGLE_CLIENT_ID ? 'LOADED' : 'MISSING')


function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  )
}

function getAuthUrl() {
  const oauth2Client = getOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar']
  })
}

function saveToken(token) {
  fs.writeFileSync('google-token.json', JSON.stringify(token, null, 2))
}

function getAuthorizedClient() {
  const oauth2Client = getOAuthClient()

  const raw = fs.readFileSync('google-token.json', 'utf8')
  if (!raw) throw new Error('Missing Google token')

  const token = JSON.parse(raw)
  oauth2Client.setCredentials(token)

  return oauth2Client
}


async function createCalendarEvent(event) {
  const auth = getAuthorizedClient()
  const calendar = google.calendar({ version: 'v3', auth })

  return calendar.events.insert({
    calendarId: process.env.GOOGLE_TICKTICK_CALENDAR_ID,
    requestBody: event
  })
}

async function getEventById(eventId) {
  const auth = getAuthorizedClient()
  const calendar = google.calendar({ version: 'v3', auth })

  return calendar.events.get({
    calendarId: process.env.GOOGLE_TICKTICK_CALENDAR_ID,
    eventId,
    showDeleted: true
  })
}


module.exports = {
  getAuthUrl,
  saveToken,
  createCalendarEvent,
  getEventById
}
