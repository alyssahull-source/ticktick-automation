// imports & setup
console.log('Starting server')

const express = require('express')
const axios = require('axios')
const fs = require('fs')

const app = express()
app.use(express.json())

const ticktick = require('./ticktick')
const googleApi = require('./google')
const actions = require('./actions')

// --------------------
// TickTick OAuth
// --------------------
app.get('/oauth/login', (req, res) => {
  const clientId = process.env.TICKTICK_CLIENT_ID
  const redirectUri = 'https://ticktick-automation.onrender.com/oauth/callback'

  const authUrl =
    'https://ticktick.com/oauth/authorize' +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`

  res.redirect(authUrl)
})

app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code
  if (!code) return res.status(400).send('Missing authorization code')

  try {
    const tokenResponse = await axios.post(
      'https://ticktick.com/oauth/token',
      null,
      {
        params: {
          client_id: process.env.TICKTICK_CLIENT_ID,
          client_secret: process.env.TICKTICK_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: 'https://ticktick-automation.onrender.com/oauth/callback'
        }
      }
    )

    fs.writeFileSync(
      'token.json',
      JSON.stringify(tokenResponse.data, null, 2)
    )

    console.log('OAuth token saved')
    res.send('Authorization successful! You can close this tab.')
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message)
    res.status(500).send('OAuth failed')
  }
})

// --------------------
// Google OAuth
// --------------------
app.get('/google/login', (req, res) => {
  res.redirect(googleApi.getAuthUrl())
})

app.get('/google/callback', async (req, res) => {
  const code = req.query.code

  try {
    const oauth2Client = new (require('googleapis').google.auth.OAuth2)(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://ticktick-automation.onrender.com/oauth/login'
    )

    const { tokens } = await oauth2Client.getToken(code)
    googleApi.saveToken(tokens)

    res.send('Google Calendar connected! You can close this tab.')
  } catch (err) {
    console.error(err)
    res.status(500).send('Google auth failed')
  }
})

// --------------------
// Google Calendar webhook (DELETE → complete TickTick task)
// --------------------
app.post('/google/webhook', async (req, res) => {
  res.sendStatus(200)

  const resourceState = req.headers['x-goog-resource-state']
  const eventId = req.headers['x-goog-resource-id']

  if (resourceState !== 'deleted') return

  try {
    const event = await googleApi.getEventById(eventId)
    const props = event.data.extendedProperties?.private

    if (!props?.ticktickTaskId || !props?.ticktickProjectId) return

    await ticktick.completeTask(
      props.ticktickProjectId,
      props.ticktickTaskId
    )

    console.log('TickTick task completed:', props.ticktickTaskId)
  } catch (err) {
    console.error('Delete sync error:', err.message)
  }
})

// --------------------
// Custom webhook (Tasker / Make)
// --------------------
app.post('/webhook', async (req, res) => {
  const { action } = req.body
  if (!action) return res.status(400).json({ error: 'Missing action' })

  const handler = actions[action]
  if (!handler)
    return res.status(400).json({ error: `Unknown action: ${action}` })

  try {
    await handler(req.body)
    res.json({ success: true })
  } catch (err) {
    console.error(err.response?.data || err.message)
    res.status(500).json({ error: 'Action failed' })
  }
})

// --------------------
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

