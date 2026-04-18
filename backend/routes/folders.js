const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const userId = req.user.id;
  const folders = all('SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC', [userId]);
  res.json(folders);
});

router.post('/', (req, res) => {
  const { run, get } = req.app.locals.db;
  const userId = req.user.id;
  const { name, color } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const { lastInsertRowid } = run(
    'INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)',
    [userId, name, color || '#6366f1']
  );
  
  res.status(201).json(get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [lastInsertRowid, userId]));
});

router.patch('/:id', (req, res) => {
  const { run, get } = req.app.locals.db;
  const userId = req.user.id;
  const { name, color } = req.body;
  
  const folder = get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!folder) return res.status(404).json({ error: 'Not found' });
  
  run('UPDATE folders SET name = ?, color = ?, updated_at = datetime("now") WHERE id = ? AND user_id = ?',
    [name ?? folder.name, color ?? folder.color, req.params.id, userId]);
    
  res.json(get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [req.params.id, userId]));
});

router.delete('/:id', (req, res) => {
  const { run, get } = req.app.locals.db;
  const userId = req.user.id;
  
  const folder = get('SELECT * FROM folders WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!folder) return res.status(404).json({ error: 'Not found' });

  run('DELETE FROM folders WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  res.json({ success: true });
});

module.exports = router;
