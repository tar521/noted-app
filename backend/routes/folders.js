const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const folders = all('SELECT * FROM folders ORDER BY created_at ASC');
  res.json(folders);
});

router.post('/', (req, res) => {
  const { run, get } = req.app.locals.db;
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const { lastInsertRowid } = run('INSERT INTO folders (name, color) VALUES (?, ?)', [name, color || '#6366f1']);
  res.status(201).json(get('SELECT * FROM folders WHERE id = ?', [lastInsertRowid]));
});

router.patch('/:id', (req, res) => {
  const { run, get } = req.app.locals.db;
  const { name, color } = req.body;
  const folder = get('SELECT * FROM folders WHERE id = ?', [req.params.id]);
  if (!folder) return res.status(404).json({ error: 'Not found' });
  run('UPDATE folders SET name = ?, color = ?, updated_at = datetime("now") WHERE id = ?',
    [name ?? folder.name, color ?? folder.color, req.params.id]);
  res.json(get('SELECT * FROM folders WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const { run } = req.app.locals.db;
  run('DELETE FROM folders WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
