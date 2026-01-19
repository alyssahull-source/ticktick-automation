const { getProjectWithData, completeTask, updateTaskContent } = require('./ticktick')
const googleApi = require('./google')

const SYNC_MARKER = '[Synced to Google Calendar]'

async function syncPriorityFiveTasks() {
  console.log('Running TickTick → Google sync')

  /* --------------------------------
     Load project IDs
  -------------------------------- */
  const PROJECT_IDS = process.env.TICKTICK_PROJECT_IDS?.split(',')
  if (!PROJECT_IDS || PROJECT_IDS.length === 0) {
    throw new Error('TICKTICK_PROJECT_IDS is not set')
  }

  /* --------------------------------
     Fetch ALL Google events once
  -------------------------------- */
  const googleEvents = await googleApi.listAllTickTickEvents()
  console.log(`Found ${googleEvents.length} Google events with TickTick metadata`)

  const eventByTaskId = new Map()
  for (const event of googleEvents) {
    const taskId = event.extendedProperties?.private?.ticktickTaskId
    if (taskId) {
      eventByTaskId.set(taskId, event)
    }
  }

  /* --------------------------------
     Fetch ALL TickTick tasks
  -------------------------------- */
  const allTasks = []

  for (const projectId of PROJECT_IDS) {
    console.log('Fetching TickTick project:', projectId)
    const projectData = await getProjectWithData(projectId)
    allTasks.push(...(projectData.tasks || []))
  }

  console.log(`Fetched ${allTasks.length} total tasks`)

  const taskById = new Map()
  for (const task of allTasks) {
    taskById.set(task.id, task)
  }

  /* --------------------------------
     Determine active priority-5 tasks
  -------------------------------- */
  const activePriorityFiveTasks = allTasks.filter(
    t => t.priority === 5 && t.status === 0 && t.dueDate
  )

  console.log(
    `Found ${activePriorityFiveTasks.length} active priority-5 tasks`
  )

  const expectedTaskIds = new Set(
    activePriorityFiveTasks.map(t => t.id)
  )

  console.log(
  'Sample TickTick task timestamps:',
  {
    title: tasks[0].title,
    dueDate: tasks[0].dueDate,
    modifiedTime: tasks[0].modifiedTime,
    completedTime: tasks[0].completedTime
  }
)


  /* --------------------------------
     GOOGLE → TICKTICK (Delete → Complete)
  -------------------------------- */
for (const task of activePriorityFiveTasks) {
  const existingEvent = eventByTaskId.get(task.id)
  if (existingEvent) continue

  const wasPreviouslySynced =
    task.content?.includes(SYNC_MARKER)

  if (!wasPreviouslySynced) {
    // Brand-new task, never synced — do NOT complete
    continue
  }

  console.log(
    `Google event missing for task "${task.title}" — completing TickTick task`
  )

  if (process.env.DRY_RUN === 'true') {
    console.log(`[DRY RUN] Would complete TickTick task ${task.id}`)
  } else {
    await completeTask(task.projectId, task.id)
  }

  expectedTaskIds.delete(task.id)
}


/* --------------------------------
   CREATE or UPDATE Google events
-------------------------------- */
for (const task of activePriorityFiveTasks) {
  if (!expectedTaskIds.has(task.id)) continue

  const existingEvent = eventByTaskId.get(task.id)
  const taskDue = new Date(task.dueDate).toISOString()

  const expectedDescription = `${task.content || ''}

---
TickTick Task ID: ${task.id}
TickTick Project ID: ${task.projectId}
`

  /* --------------------------------
     CREATE Google event
  -------------------------------- */
  if (!existingEvent) {
    console.log(`Creating event: ${task.title}`)

    await googleApi.createCalendarEvent({
      summary: task.title,
      description: expectedDescription,
      start: { dateTime: taskDue },
      end: { dateTime: taskDue },
      extendedProperties: {
        private: {
          ticktickTaskId: task.id,
          ticktickProjectId: task.projectId,
          managedBy: 'ticktick-sync'
        }
      }
    })

    if (!task.content?.includes(SYNC_MARKER)) {
      const updatedContent = `${task.content || ''}

${SYNC_MARKER}`

      await updateTaskContent(
        task.projectId,
        task.id,
        updatedContent
      )
    }

    continue
  }

  /* --------------------------------
     UPDATE logic (bidirectional)
  -------------------------------- */
  const updates = {}

  if (existingEvent.summary !== task.title) {
    updates.summary = task.title
  }

  if ((existingEvent.description || '') !== expectedDescription) {
    updates.description = expectedDescription
  }

  const googleDue = existingEvent.start?.dateTime
  const managedBySync =
    existingEvent.extendedProperties?.private?.managedBy === 'ticktick-sync'

  if (googleDue && googleDue !== taskDue && managedBySync) {
    const googleUpdated = new Date(existingEvent.updated)
    const ticktickUpdated = new Date(task.modifiedTime)

    if (googleUpdated > ticktickUpdated) {
      console.log(
        `Updating TickTick due date from Google: ${task.title}`
      )

      if (process.env.DRY_RUN === 'true') {
        console.log(
          `[DRY RUN] Would update TickTick due date to ${googleDue}`
        )
      } else {
        await updateTaskDueDate(
          task.projectId,
          task.id,
          googleDue
        )
      }
    } else {
      updates.start = { dateTime: taskDue }
      updates.end = { dateTime: taskDue }
    }
  }

  if (Object.keys(updates).length > 0) {
    console.log(`Updating event: ${task.title}`)
    await googleApi.updateCalendarEvent(existingEvent.id, updates)
  }
}

  /* --------------------------------
     DELETE stale Google events
  -------------------------------- */
  console.log(`Checking ${googleEvents.length} Google events for cleanup`)

  for (const event of googleEvents) {
    const taskId = event.extendedProperties?.private?.ticktickTaskId
    if (!taskId) continue

    const task = taskById.get(taskId)

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
