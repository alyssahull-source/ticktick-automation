const ticktick = require('./ticktick')
const googleApi = require('./google')

function toGoogleDateTime(date) {
  return {
    dateTime: new Date(date).toISOString()
  }
}

function oneHourFromNow() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString()
}

function tomorrowAt(hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function todayAt(hour = 21) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function toGoogleDateTime(isoString) {   // FIX #2
  return { dateTime: isoString }
}

const actions = {
  laundry: async () => {
    const response = await ticktick.createTask({
      title: 'Move laundry',
      dueDate: oneHourFromNow(),
      priority: 3
    })

    const taskId = response.data.id
    await ticktick.addReminder(taskId, 'TRIGGER:PT0S')
  },

  voicemail: async (payload) => {
    return ticktick.createTask({
      title: payload.title || 'Follow up voicemail',
      description: payload.description || '',
      startDate: tomorrowAt(9),
      priority: 3
    })
  },

  feddog: async () => {
    await ticktick.completeTask(
      '5bc2b62fe35eaff6a67b9872',
      '69614646da9a8524e588ca1e'
    )
  },

  task: async (payload) => {
  const response = await ticktick.createTask({
    title: payload.title,
    description: payload.description || '',
    priority: payload.priority || 0,
    dueDate: payload.dueDate
  })

  const taskId = response.data.id

  // ✅ ONLY sync high-priority tasks
  if (payload.priority === 5 && payload.dueDate) {
    const start = new Date(payload.dueDate)
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + 30)


    await googleApi.createCalendarEvent({
  summary: payload.title,
  description: payload.description || '',
  start: { dateTime: start.toISOString() },
  end: { dateTime: end.toISOString() },
  extendedProperties: {
    private: {
      ticktickTaskId: taskId,
      ticktickProjectId: payload.projectId || ''
    }
  }
})
  }

  return taskId
},


  amazon: async (payload) => {
    return ticktick.createTask({
      title: payload.title || 'Amazon Package',
      description: payload.description || '',
      dueDate: todayAt(19),
      priority: 3
    })
  }
}

module.exports = actions
