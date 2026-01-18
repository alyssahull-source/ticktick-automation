const { getProjectWithData } = require('./ticktick')
const googleApi = require('./google')

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  const PROJECT_ID = process.env.TICKTICK_PROJECT_ID
  if (!PROJECT_ID) {
    throw new Error('TICKTICK_PROJECT_ID is not set')
  }

  console.log('Using TickTick project:', PROJECT_ID)

  const projectData = await getProjectWithData(PROJECT_ID)
  const tasks = projectData.tasks || []

  console.log(`Fetched ${tasks.length} tasks from TickTick project`)

  const priorityFiveTasks = tasks.filter(
    task => task.priority === 5 && task.status === 0
  )

  console.log(`Found ${priorityFiveTasks.length} priority-5 tasks`)

  for (const task of priorityFiveTasks) {
    if (!task.id) {
      console.warn('Skipping task with missing ID', task)
      continue
    }

    if (!task.dueDate) {
      console.log(`Skipping task with no due date: ${task.title}`)
      continue
    }

    const existingEvent = await googleApi.findEventByTickTickId(task.id)

    if (existingEvent) {
      console.log(
        `Skipping existing Google event for TickTick task: ${task.title}`
      )
      continue
    }

    console.log(`Creating Google event for TickTick task: ${task.title}`)

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

  console.log('Sync completed successfully')
}

module.exports = { syncPriorityFiveTasks }
