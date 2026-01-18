// Load the SQLite library
const Database = require('better-sqlite3')

// Open (or create) a database file called data.db
const db = new Database('data.db')

db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ticktick_id TEXT,
    google_event_id TEXT,

    title TEXT,
    description TEXT,
    priority INTEGER,
    status TEXT,

    start_time TEXT,
    end_time TEXT,

    created_at TEXT,
    updated_at TEXT
  )
`).run()


// Export the database so other files can use it
module.exports = db
