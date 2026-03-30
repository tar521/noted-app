const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DB_PATH = path.join(DATA_DIR, 'noted.db');

let db = null;

function persist() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

let dirty = false;
function markDirty() { dirty = true; }
setInterval(() => { if (dirty && db) { persist(); dirty = false; } }, 5000);

function run(sql, params = []) {
  db.run(sql, params);
  markDirty();
  const row = db.exec('SELECT last_insert_rowid() as id')[0];
  return { lastInsertRowid: row ? row.values[0][0] : null };
}

function all(sql, params = []) {
  const result = db.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

async function init() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      due_date TEXT DEFAULT NULL,
      tags TEXT DEFAULT '[]',
      order_index INTEGER DEFAULT 0, -- Add this line
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      meta TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  const folderCount = get('SELECT COUNT(*) as count FROM folders');
  if (!folderCount || folderCount.count === 0) {
    const { lastInsertRowid: folderId } = run(
      "INSERT INTO folders (name, color) VALUES (?, ?)",
      ['Getting Started', '#6366f1']
    );
    run("INSERT INTO notes (folder_id, title, content) VALUES (?, ?, ?)", [
      folderId,
      'Welcome to Noted',
      JSON.stringify({
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Noted' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'This is your personal notes and todo tracker.' }] },
          { type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Create folders to organize your notes' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write rich notes with full formatting' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Track todos with priorities, due dates, and tags' }] }] },
          ]},
        ]
      })
    ]);
    run("INSERT INTO todos (title, priority, tags) VALUES (?, ?, ?)", ['Set up your first folder', 'high', JSON.stringify(['setup'])]);
    run("INSERT INTO todos (title, priority, tags) VALUES (?, ?, ?)", ['Try writing your first note', 'medium', JSON.stringify(['notes'])]);
    persist();
  }

  return { run, all, get, persist };
}

module.exports = { init };
