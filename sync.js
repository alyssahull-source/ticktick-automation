const { getProjectWithData } = require('./ticktick')
const googleApi = require('./google')

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  const PROJECT_IDS = process.env.TICKTICK_PROJECT_IDS?.split(',')
  if (!PROJECT_IDS || PROJECT_IDS.length === 0) {
    throw new Error('TICKTICK_PROJECT_IDS is not set')
  }

const allEvents = await googleApi.listAllTickTickEvents()

console.log(
  `Found ${allEvents.length} Google events with TickTick metadata`
)

for (const event of allEvents) {
  console.log(
    'Google Event:',
    event.id,
    event.summary,
    event.extendedProperties?.private
  )
}


  const allTasks = []

  for (const projectId of PROJECT_IDS) {
    console.log('Fetching TickTick project:', projectId)
    const projectData = await getProjectWithData(projectId)
    allTasks.push(...(projectData.tasks || []))
  }

  console.log(`Fetched ${allTasks.length} total tasks`)

  const validTasks = allTasks.filter(
    t => t.priority === 5 && t.status === 0
  )

  console.log(`Found ${validTasks.length} active priority-5 tasks`)

  const taskMap = new Map()
  for (const task of allTasks) {
    taskMap.set(task.id, task)
  }

  /* -------------------------------
     CREATE missing Google events
  -------------------------------- */
  for (const task of validTasks) {
    if (!task.dueDate) continue

    const existingEvent = await googleApi.findEventByTickTickId(task.id)

    if (existingEvent) continue

    console.log(`Creating event: ${task.title}`)

    await googleApi.createCalendarEvent({
  summary: task.title,
  description: `${task.content || ''}

---
TickTick Task ID: ${task.id}
TickTick Project ID: ${task.projectId}
`,
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

  /* -------------------------------
     DELETE stale Google events
  -------------------------------- */
  const googleEvents = await googleApi.listAllTickTickEvents()

  console.log(`Checking ${googleEvents.length} Google events for cleanup`)

  for (const event of googleEvents) {
    const ticktickTaskId =
      event.extendedProperties?.private?.ticktickTaskId

    if (!ticktickTaskId) continue

    const task = taskMap.get(ticktickTaskId)

    const shouldDelete =
      !task ||
      task.status !== 0 ||
      task.priority !== 5

    if (shouldDelete) {
      console.log(`Deleting event: ${event.summary}`)
      await googleApi.deleteEvent(event.id)
    }
  }

  console.log('Sync completed successfully')
}

module.exports = { syncPriorityFiveTasks }
