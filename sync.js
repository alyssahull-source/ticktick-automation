const fs = require('fs')
// const ticktick = require('./ticktick')
const googleApi = require('./google')

const SYNC_FILE = 'synced.json'

function loadSynced() {
  try {
    if (!fs.existsSync(SYNC_FILE)) return {}

    const raw = fs.readFileSync(SYNC_FILE, 'utf8')
    if (!raw) return {}

    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to read synced.json, resetting:', err.message)
    return {}
  }
}


function saveSynced(data) {
  fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2))
}

function toGoogleDateTime(date) {
  return { dateTime: new Date(date).toISOString() }
}

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  const synced = loadSynced()

  // 1. Fetch tasks
  const tasks = await ticktick.getAllTasks()

  for (const task of tasks) {
    if (task.priority !== 5) continue
    if (!task.startDate && !task.dueDate) continue
    if (synced[task.id]) continue

    // 2. Create calendar event
    const event = await googleApi.createCalendarEvent({
      summary: task.title,
      description: task.content || '',
      start: toGoogleDateTime(task.startDate || task.dueDate),
      end: toGoogleDateTime(task.dueDate || task.startDate),
      extendedProperties: {
        private: {
          ticktickTaskId: task.id,
          ticktickProjectId: task.projectId
        }
      }
    })

    synced[task.id] = event.data.id
    console.log('Synced task → calendar:', task.title)
  }

  saveSynced(synced)
}

module.exports = {
  syncPriorityFiveTasks
}
