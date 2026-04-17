const express = require('express');
const router = express.Router();

// GET all configurations as a single object
router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const rows = all('SELECT key_name, data FROM configuration_data');
  
  // Transform list of rows into a single object: { PRIORITY_LIST: [...], ... }
  const config = {};
  rows.forEach(row => {
    config[row.key_name] = JSON.parse(row.data);
  });
  
  res.json(config);
});

// UPDATE a specific configuration
router.put('/:key', (req, res) => {
  const { run } = req.app.locals.db;
  const { key } = req.params;
  const { data } = req.body;

  if (data === undefined) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const jsonString = JSON.stringify(data);
    
    // Using a simpler REPLACE INTO or the full UPSERT syntax
    const sql = `
      INSERT INTO configuration_data (key_name, data) 
      VALUES (?, ?) 
      ON CONFLICT(key_name) 
      DO UPDATE SET data = excluded.data
    `;
    
    run(sql, [key, jsonString]);
    res.json({ success: true });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: err.message });
  }

//   run(
//     "INSERT INTO configuration_data (key_name, data) VALUES (?, ?) ON CONFLICT(key_name) DO UPDATE SET data = excluded.data",
//     [key, JSON.stringify(data)]
//   );
  
//   res.json({ success: true });
});

module.exports = router;