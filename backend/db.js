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
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      google_id TEXT,
      name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
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
      user_id INTEGER,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'Not Started',
      due_date TEXT DEFAULT NULL,
      tags TEXT DEFAULT '[]',
      order_index INTEGER DEFAULT 0,
      kanban_order_index INTEGER DEFAULT 0,
      description TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Ensure user_id column exists for older databases
  const tablesToUpdate = ['folders', 'notes', 'todos', 'activity_log', 'configuration_data'];
  tablesToUpdate.forEach(table => {
    try { db.run(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER`); } catch(e) {}
  });

  try { db.run("ALTER TABLE todos ADD COLUMN status TEXT DEFAULT 'Not Started'"); } catch(e) {}
  try { db.run("ALTER TABLE todos ADD COLUMN kanban_order_index INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE todos ADD COLUMN description TEXT DEFAULT NULL"); } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      meta TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // 0. Fix the configuration_data table to support per-user UNIQUE keys
  try {
    // Check if the current table has user_id in its unique constraint
    const tableInfo = db.exec("PRAGMA index_list('configuration_data')");
    // If table exists, we'll recreate it to be safe and ensure the new schema
    db.run(`
      CREATE TABLE IF NOT EXISTS configuration_data_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        key_name TEXT,
        data TEXT,
        UNIQUE(user_id, key_name)
      )
    `);
    
    // Copy data over if the old table has user_id column
    try {
        db.run("INSERT INTO configuration_data_new (user_id, key_name, data) SELECT user_id, key_name, data FROM configuration_data");
    } catch (e) {
        // If user_id didn't exist, we'll handle it during the default user migration below
        db.run("INSERT INTO configuration_data_new (key_name, data) SELECT key_name, data FROM configuration_data");
    }
    
    db.run("DROP TABLE configuration_data");
    db.run("ALTER TABLE configuration_data_new RENAME TO configuration_data");
  } catch (e) {
    // If it fails because the table doesn't exist, just create it
    db.run(`CREATE TABLE IF NOT EXISTS configuration_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      key_name TEXT,
      data TEXT,
      UNIQUE(user_id, key_name)
    )`);
  }

  // 1. Ensure a Default User exists
  let defaultUser = get("SELECT id FROM users WHERE email = ?", ['default@noted.app']);
  if (!defaultUser) {
    const { lastInsertRowid } = run(
      "INSERT INTO users (email, name) VALUES (?, ?)",
      ['default@noted.app', 'Default User']
    );
    defaultUser = { id: lastInsertRowid };
  }

  // 2. Migrate any orphaned data to the Default User
  tablesToUpdate.forEach(table => {
    db.run(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`, [defaultUser.id]);
  });

  // Check if we need to seed the defaults for the default user
  const configCount = get('SELECT COUNT(*) as count FROM configuration_data WHERE user_id = ?', [defaultUser.id]);
  if (!configCount || configCount.count === 0) {
    const defaults = [
      ['PRIORITY_LIST', ['work', 'personal']],
      ['PRIORITY_COLORS', {
        work: '#c047c2',
        personal: '#28d0d6'
      }],
      ['PRIORITY_BGS', {
        work: 'rgba(192, 71, 194, 0.1)',
        personal: 'rgba(40, 208, 214, 0.1)'
      }]
    ];

    defaults.forEach(([key, value]) => {
      run("INSERT INTO configuration_data (user_id, key_name, data) VALUES (?, ?, ?)", [defaultUser.id, key, JSON.stringify(value)]);
    });
  }

  const folderCount = get('SELECT COUNT(*) as count FROM folders WHERE user_id = ?', [defaultUser.id]);
  if (!folderCount || folderCount.count === 0) {
    const { lastInsertRowid: folderId } = run(
      "INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)",
      [defaultUser.id, 'Getting Started', '#6366f1']
    );
    run("INSERT INTO notes (user_id, folder_id, title, content) VALUES (?, ?, ?, ?)", [
      defaultUser.id,
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
    run("INSERT INTO todos (user_id, title, priority, tags) VALUES (?, ?, ?, ?)", [defaultUser.id, 'Set up your first folder', 'high', JSON.stringify(['setup'])]);
    run("INSERT INTO todos (user_id, title, priority, tags) VALUES (?, ?, ?, ?)", [defaultUser.id, 'Try writing your first note', 'medium', JSON.stringify(['notes'])]);
    persist();
  }

  return { run, all, get, persist };
}

module.exports = { init };
