const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const { limit = 200, entity, type } = req.query;
  let sql = 'SELECT * FROM activity_log';
  const conditions = [];
  const params = [];
  if (entity) { conditions.push('entity = ?'); params.push(entity); }
  if (type)   { conditions.push('type = ?');   params.push(type); }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const rows = all(sql, params).map(r => ({ ...r, meta: JSON.parse(r.meta || '{}') }));
  res.json(rows);
});

module.exports = router;