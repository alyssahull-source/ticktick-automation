const { getProjectWithData } = require('./ticktick')
const googleApi = require('./google')

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  const rawProjectIds = process.env.TICKTICK_PROJECT_IDS
  if (!rawProjectIds) {
    throw new Error('TICKTICK_PROJECT_IDS is not set')
  }

  const projectIds = rawProjectIds
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)

  console.log(`Syncing ${projectIds.length} TickTick projects`)

  for (const projectId of projectIds) {
    console.log(`\n📂 Processing project: ${projectId}`)

    const projectData = await getProjectWithData(projectId)
    const tasks = projectData.tasks || []

    console.log(`Fetched ${tasks.length} tasks`)

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
        console.log(`➕ Creating event: ${task.title}`)
        await googleApi.createCalendarEvent(eventPayload)
        continue
      }

      const existingDate =
        existingEvent.start?.dateTime || existingEvent.start?.date

      if (existingDate !== task.dueDate) {
        console.log(`✏️ Updating event date: ${task.title}`)
        await googleApi.updateCalendarEvent(existingEvent.id, {
          start: { dateTime: task.dueDate },
          end: { dateTime: task.dueDate }
        })
      } else {
        console.log(`⏭ No change: ${task.title}`)
      }
    }
  }

  console.log('\n✅ Sync completed successfully')
}

module.exports = { syncPriorityFiveTasks }
