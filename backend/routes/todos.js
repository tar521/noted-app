const express = require('express');
const router = express.Router();

function log(db, type, entity, entity_id, label, meta = {}) {
  try {
    db.run(
      "INSERT INTO activity_log (type, entity, entity_id, label, meta) VALUES (?, ?, ?, ?, ?)",
      [type, entity, entity_id, label, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error(`[ACTIVITY LOG ERROR] ${err.message}`);
  }
}

// GET /api/todos
router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  // Change "ORDER BY created_at DESC" to "ORDER BY order_index ASC"
  const rows = all('SELECT * FROM todos ORDER BY order_index ASC');
  
  // PARSE tags from String to Array for React
  const formatted = rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]')
  }));
  res.json(formatted);
});

// POST /api/todos
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, priority, due_date, tags, status } = req.body;
  
  // 1. Get the current minimum order_index to place the new todo at the top
  const minOrder = db.get('SELECT MIN(order_index) as min_idx FROM todos');
  const newOrderIndex = (minOrder && minOrder.min_idx !== null) ? minOrder.min_idx - 1 : 0;

  const defaultStatus = status || 'Not Started';

  // 2. Insert with the new order_index
  const { lastInsertRowid } = db.run(
    "INSERT INTO todos (title, priority, due_date, tags, order_index, status) VALUES (?, ?, ?, ?, ?, ?)",
    [
      title, 
      priority || 'medium', 
      due_date || null, 
      JSON.stringify(tags || []), 
      newOrderIndex,
      defaultStatus
    ]
  );

  log(db, 'todo_created', 'todo', lastInsertRowid, `Created todo: ${title}`);
  
  const newTodo = db.get('SELECT * FROM todos WHERE id = ?', [lastInsertRowid]);
  res.status(201).json({ ...newTodo, tags: JSON.parse(newTodo.tags || '[]') });
});

// PUT /api/todos/reorder
router.put('/reorder', (req, res) => {
  const { run } = req.app.locals.db;
  const { ids } = req.body; // Expecting an array of IDs in the new order

  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  // Update each todo with its new index based on the array position
  ids.forEach((id, index) => {
    run('UPDATE todos SET order_index = ? WHERE id = ?', [index, id]);
  });

  res.json({ success: true });
});

// PUT /api/todos/kanban-reorder
router.put('/kanban-reorder', (req, res) => {
  const { run, db } = req.app.locals.db;
  const { columns } = req.body; // { 'Not Started': [id1, id2], 'In Progress': [id3] }

  if (!columns || typeof columns !== 'object') return res.status(400).json({ error: 'Invalid columns' });

  // Update status and kanban_order_index for all items in each column
  Object.entries(columns).forEach(([status, ids]) => {
    if (!Array.isArray(ids)) return;
    ids.forEach((id, index) => {
      // Also update 'completed' based on status if it's 'Merged/Completed'
      const completed = (status === 'Merged/Completed' ? 1 : 0);
      req.app.locals.db.run('UPDATE todos SET status = ?, kanban_order_index = ?, completed = ? WHERE id = ?', [status, index, completed, id]);
    });
  });

  res.json({ success: true });
});

// PATCH /api/todos/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const todo = db.get('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  let { title, completed, priority, due_date, tags, status } = req.body;

  // Sync logic: If completed is updated, update status
  if (completed !== undefined && status === undefined) {
    status = completed ? 'Merged/Completed' : 'Not Started';
  }
  // If status is updated, update completed
  if (status !== undefined && completed === undefined) {
    completed = (status === 'Merged/Completed');
  }

  // Log activity BEFORE the update to have original state
  let activityType = null;
  let activityLabel = null;

  if (status !== undefined && status !== todo.status) {
    activityType = 'todo_updated';
    activityLabel = `Changed status to "${status}" for: ${todo.title}`;
    
    // Check if it's a completion/reopen via status
    if (status === 'Merged/Completed' && todo.status !== 'Merged/Completed') {
      activityType = 'todo_completed';
      activityLabel = `Completed todo: ${todo.title}`;
    } else if (status !== 'Merged/Completed' && todo.status === 'Merged/Completed') {
      activityType = 'todo_reopened';
      activityLabel = `Reopened todo: ${todo.title}`;
    }
  } else if (completed !== undefined) {
    const isCurrentlyCompleted = todo.completed === 1;
    const willBeCompleted = !!completed;
    if (willBeCompleted !== isCurrentlyCompleted) {
      activityType = willBeCompleted ? 'todo_completed' : 'todo_reopened';
      activityLabel = willBeCompleted ? `Completed todo: ${todo.title}` : `Reopened todo: ${todo.title}`;
    }
  } else if (title && title !== todo.title) {
    activityType = 'todo_updated';
    activityLabel = `Renamed todo to: ${title}`;
  } else if (priority && priority !== todo.priority) {
    activityType = 'todo_updated';
    activityLabel = `Updated priority for: ${todo.title}`;
  }

  if (activityType) {
    log(db, activityType, 'todo', parseInt(req.params.id), activityLabel);
  }

  const completedVal = completed !== undefined ? (completed ? 1 : 0) : todo.completed;

  db.run(`UPDATE todos SET 
    title = ?, 
    completed = ?, 
    status = ?,
    priority = ?, 
    due_date = ?, 
    tags = ?, 
    updated_at = datetime('now') 
    WHERE id = ?`,
    [
      title ?? todo.title,
      completedVal,
      status ?? todo.status,
      priority ?? todo.priority,
      due_date ?? todo.due_date,
      tags ? JSON.stringify(tags) : todo.tags,
      req.params.id
    ]
  );

  const updated = db.get('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]') }); // PARSE here
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;

  // Optional: Log the deletion to your activity history
  const todo = db.get('SELECT title FROM todos WHERE id = ?', [id]);
  if (todo) {
    log(db, 'todo_deleted', 'todo', id, `Deleted todo: ${todo.title}`);
  }

  // Perform the actual deletion
  db.run('DELETE FROM todos WHERE id = ?', [id]);

  // Send 204 No Content. 
  // This tells the frontend "I did it, and there's nothing more to say."
  res.status(204).end();
});

module.exports = router;