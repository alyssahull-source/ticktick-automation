const { google } = require('googleapis')

const REDIRECT_URI = 'https://ticktick-automation.onrender.com/google/callback'

console.log(
  'GOOGLE CLIENT ID:',
  process.env.GOOGLE_CLIENT_ID ? 'LOADED' : 'MISSING'
)

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
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar']
  })
}

function saveToken(token) {
  if (!token.refresh_token) {
    console.warn('No refresh token returned from Google')
    return
  }

  console.log('Google refresh token received and stored')
}

function getAuthorizedClient() {
  const oauth2Client = getOAuthClient()

  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      'Google not authorized yet. GOOGLE_REFRESH_TOKEN missing in environment.'
    )
  }

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  })

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

async function findEventByTickTickId(ticktickTaskId) {
  const auth = getAuthorizedClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_TICKTICK_CALENDAR_ID,
    privateExtendedProperty: `ticktickTaskId=${ticktickTaskId}`,
    maxResults: 1
  })

  return res.data.items?.[0] || null
}

async function updateCalendarEvent(eventId, updatedFields) {
  const auth = getAuthorizedClient()
  const calendar = google.calendar({ version: 'v3', auth })

  return calendar.events.patch({
    calendarId: process.env.GOOGLE_TICKTICK_CALENDAR_ID,
    eventId,
    requestBody: updatedFields
  })
}


module.exports = {
  getAuthUrl,
  saveToken,
  createCalendarEvent,
  updateCalendarEvent,
  getEventById,
  findEventByTickTickId
}
