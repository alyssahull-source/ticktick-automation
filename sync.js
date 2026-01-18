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
    if (!task.id || !task.dueDate) continue

    const existingEvent = await googleApi.findEventByTickTickId(task.id)

    const eventPayload = {
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
    }

    if (!existingEvent) {
      console.log(`Creating Google event: ${task.title}`)

      await googleApi.createCalendarEvent(eventPayload)
      continue
    }

    const existingDate =
      existingEvent.start?.dateTime || existingEvent.start?.date

    if (existingDate !== task.dueDate) {
      console.log(`Updating Google event date: ${task.title}`)

      await googleApi.updateCalendarEvent(
        existingEvent.id,
        {
          start: { dateTime: task.dueDate },
          end: { dateTime: task.dueDate }
        }
      )
    } else {
      console.log(`No change for task: ${task.title}`)
    }
  }

  console.log('Sync completed successfully')
}

module.exports = { syncPriorityFiveTasks }
