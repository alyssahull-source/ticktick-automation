const ticktick = require('./ticktick')
const googleApi = require('./google')

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  const tasks = await ticktick.getAllTasks()

  const highPriority = tasks.filter(t => t.priority === 5)

  for (const task of highPriority) {
    if (!task.dueDate) continue

    await googleApi.createCalendarEvent({
      summary: task.title,
      description: task.content || '',
      start: { dateTime: task.dueDate },
      end: { dateTime: task.dueDate },
      extendedProperties: {
        private: {
          ticktickTaskId: task.id,
          ticktickProjectId: task.projectId
        }
      }
    })
  }
}

module.exports = { syncPriorityFiveTasks }
