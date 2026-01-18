const { getTasksByProject } = require('./ticktick')
const googleApi = require('./google')

const PROJECT_ID = process.env.TICKTICK_PROJECT_ID

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')
  console.log('Using TickTick project:', PROJECT_ID)

  if (!PROJECT_ID) {
    throw new Error('TICKTICK_PROJECT_ID is not set')
  }

  const tasks = await getTasksByProject(PROJECT_ID)

  console.log('Total tasks fetched:', tasks.length)

  const highPriority = tasks.filter(t => t.priority === 5)

  console.log('Priority 5 tasks:', highPriority.length)

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
