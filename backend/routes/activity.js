const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const userId = req.user.id;
  const { limit = 200, entity, type } = req.query;
  
  let sql = 'SELECT * FROM activity_log WHERE user_id = ?';
  const params = [userId];
  
  if (entity) { sql += ' AND entity = ?'; params.push(entity); }
  if (type)   { sql += ' AND type = ?';   params.push(type); }
  
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const rows = all(sql, params).map(r => ({ ...r, meta: JSON.parse(r.meta || '{}') }));
  res.json(rows);
});

module.exports = router;
