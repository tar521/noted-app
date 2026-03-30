const express = require('express');
const router = express.Router();

function log(db, type, entity, entity_id, label, meta = {}) {
  db.run(
    "INSERT INTO activity_log (type, entity, entity_id, label, meta) VALUES (?, ?, ?, ?, ?)",
    [type, entity, entity_id, label, JSON.stringify(meta)]
  );
}

router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const { folder_id, limit } = req.query;
  let sql = 'SELECT id, folder_id, title, created_at, updated_at FROM notes';
  const params = [];
  if (folder_id) { sql += ' WHERE folder_id = ?'; params.push(folder_id); }
  sql += ' ORDER BY updated_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json(all(sql, params));
});

router.get('/:id', (req, res) => {
  const { get } = req.app.locals.db;
  const note = get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
  if (!note) return res.status(404).json({ error: 'Not found' });
  res.json(note);
});

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { folder_id, title, content } = req.body;
  const { lastInsertRowid } = db.run(
    'INSERT INTO notes (folder_id, title, content) VALUES (?, ?, ?)',
    [folder_id || null, title || 'Untitled', content ? JSON.stringify(content) : '{}']
  );
  log(db, 'note_created', 'note', lastInsertRowid, `Created note "${title || 'Untitled'}"`, { folder_id });
  res.status(201).json(db.get('SELECT * FROM notes WHERE id = ?', [lastInsertRowid]));
});

router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const note = db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
  if (!note) return res.status(404).json({ error: 'Not found' });
  const { title, content, folder_id } = req.body;

  if (title && title !== note.title) {
    log(db, 'note_updated', 'note', note.id, `Renamed note to "${title}"`, {});
  } else if (content !== undefined) {
    log(db, 'note_updated', 'note', note.id, `Edited "${note.title}"`, {});
  }

  db.run(`UPDATE notes SET
    title = ?,
    content = ?,
    folder_id = ?,
    updated_at = datetime('now')
    WHERE id = ?`,
    [
      title ?? note.title,
      content !== undefined ? JSON.stringify(content) : note.content,
      folder_id ?? note.folder_id,
      req.params.id
    ]
  );
  res.json(db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const note = db.get('SELECT * FROM notes WHERE id = ?', [req.params.id]);
  if (note) log(db, 'note_deleted', 'note', note.id, `Deleted "${note.title}"`, {});
  db.run('DELETE FROM notes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;