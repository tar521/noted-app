const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET all configurations as a single object
router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const userId = req.user.id;
  const rows = all('SELECT key_name, data FROM configuration_data WHERE user_id = ?', [userId]);
  
  const config = {};
  rows.forEach(row => {
    config[row.key_name] = JSON.parse(row.data);
  });
  
  res.json(config);
});

// UPDATE a specific configuration
router.put('/:key', (req, res) => {
  const { run } = req.app.locals.db;
  const userId = req.user.id;
  const { key } = req.params;
  const { data } = req.body;

  if (data === undefined) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const jsonString = JSON.stringify(data);
    
    // UPSERT with user_id
    const sql = `
      INSERT INTO configuration_data (user_id, key_name, data) 
      VALUES (?, ?, ?) 
      ON CONFLICT(user_id, key_name) 
      DO UPDATE SET data = excluded.data
    `;
    
    run(sql, [userId, key, jsonString]);
    res.json({ success: true });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
