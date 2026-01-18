const axios = require('axios')
const fs = require('fs')

function getAccessToken() {
  if (!fs.existsSync('token.json')) {
    throw new Error('TickTick not authorized yet. Visit /oauth/login')
  }

  const raw = fs.readFileSync('token.json', 'utf8')
  const data = JSON.parse(raw)

  if (!data.access_token) {
    throw new Error('Invalid TickTick token.json')
  }

  return data.access_token
}





function createClient() {
  return axios.create({
    baseURL: 'https://api.ticktick.com/open/v1',
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })
}

function formatTickTickDate(date) {
  if (!date) return null

  const pad = (n, z = 2) => String(n).padStart(z, '0')

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())
  const milliseconds = pad(date.getUTCMilliseconds(), 3)

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+0000`
}


async function createTask(task) {
  const client = createClient()

  const payload = {
    title: task.title,
    content: task.description || '',
    priority: task.priority || 0
  }

  if (task.startDate) {
    payload.startDate = formatTickTickDate(new Date(task.startDate))
  }

  if (task.dueDate) {
    payload.dueDate = formatTickTickDate(new Date(task.dueDate))
  }

  return client.post('/task', payload)
}


async function addReminder(taskId, trigger) {
  const client = createClient()

  return client.post(`/task/${taskId}/reminders`, [
    {
      trigger
    }
  ])
}


async function completeTask(projectId, taskId) {
  const client = createClient()

  return client.post(
    `/project/${projectId}/task/${taskId}/complete`
  )
}

async function getAllTasks() {
  const client = createClient()

  const res = await client.get('/tasks')
  return res.data
}

module.exports = {
  createTask,
  completeTask,
  addReminder,
  getAllTasks
}


