const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

function log(db, userId, type, entity, entity_id, label, meta = {}) {
  try {
    db.run(
      "INSERT INTO activity_log (user_id, type, entity, entity_id, label, meta) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, type, entity, entity_id, label, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error(`[ACTIVITY LOG ERROR] ${err.message}`);
  }
}

router.use(authenticateToken);

// GET /api/todos
router.get('/', (req, res) => {
  const { all } = req.app.locals.db;
  const userId = req.user.id;
  const rows = all('SELECT * FROM todos WHERE user_id = ? ORDER BY order_index ASC', [userId]);
  
  const formatted = rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]')
  }));
  res.json(formatted);
});

// POST /api/todos
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { title, priority, due_date, tags, status, description } = req.body;
  
  const minOrder = db.get('SELECT MIN(order_index) as min_idx FROM todos WHERE user_id = ?', [userId]);
  const newOrderIndex = (minOrder && minOrder.min_idx !== null) ? minOrder.min_idx - 1 : 0;

  const defaultStatus = status || 'Not Started';

  const { lastInsertRowid } = db.run(
    "INSERT INTO todos (user_id, title, priority, due_date, tags, order_index, status, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      userId,
      title, 
      priority || 'medium', 
      due_date || null, 
      JSON.stringify(tags || []), 
      newOrderIndex,
      defaultStatus,
      description || null
    ]
  );

  log(db, userId, 'todo_created', 'todo', lastInsertRowid, `Created todo: ${title}`);
  
  const newTodo = db.get('SELECT * FROM todos WHERE id = ? AND user_id = ?', [lastInsertRowid, userId]);
  res.status(201).json({ ...newTodo, tags: JSON.parse(newTodo.tags || '[]') });
});

// PUT /api/todos/reorder
router.put('/reorder', (req, res) => {
  const { run } = req.app.locals.db;
  const userId = req.user.id;
  const { ids } = req.body;

  if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

  ids.forEach((id, index) => {
    run('UPDATE todos SET order_index = ? WHERE id = ? AND user_id = ?', [index, id, userId]);
  });

  res.json({ success: true });
});

// PUT /api/todos/kanban-reorder
router.put('/kanban-reorder', (req, res) => {
  const { run } = req.app.locals.db;
  const userId = req.user.id;
  const { columns } = req.body;

  if (!columns || typeof columns !== 'object') return res.status(400).json({ error: 'Invalid columns' });

  Object.entries(columns).forEach(([status, ids]) => {
    if (!Array.isArray(ids)) return;
    ids.forEach((id, index) => {
      const completed = (status === 'Merged/Completed' ? 1 : 0);
      run('UPDATE todos SET status = ?, kanban_order_index = ?, completed = ? WHERE id = ? AND user_id = ?', 
        [status, index, completed, id, userId]);
    });
  });

  res.json({ success: true });
});

// PATCH /api/todos/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const todo = db.get('SELECT * FROM todos WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  let { title, completed, priority, due_date, tags, status, description } = req.body;

  if (completed !== undefined && status === undefined) {
    status = completed ? 'Merged/Completed' : 'Not Started';
  }
  if (status !== undefined && completed === undefined) {
    completed = (status === 'Merged/Completed');
  }

  let activityType = null;
  let activityLabel = null;

  if (status !== undefined && status !== todo.status) {
    activityType = 'todo_updated';
    activityLabel = `Changed status to "${status}" for: ${todo.title}`;
    
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
    log(db, userId, activityType, 'todo', parseInt(req.params.id), activityLabel);
  }

  const completedVal = completed !== undefined ? (completed ? 1 : 0) : todo.completed;

  db.run(`UPDATE todos SET 
    title = ?, 
    completed = ?, 
    status = ?,
    priority = ?, 
    due_date = ?, 
    tags = ?, 
    description = ?,
    updated_at = datetime('now') 
    WHERE id = ? AND user_id = ?`,
    [
      title ?? todo.title,
      completedVal,
      status ?? todo.status,
      priority ?? todo.priority,
      due_date ?? todo.due_date,
      tags ? JSON.stringify(tags) : todo.tags,
      description ?? todo.description,
      req.params.id,
      userId
    ]
  );

  const updated = db.get('SELECT * FROM todos WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  res.json({ ...updated, tags: JSON.parse(updated.tags || '[]') });
});

// DELETE /api/todos/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const userId = req.user.id;
  const { id } = req.params;

  const todo = db.get('SELECT title FROM todos WHERE id = ? AND user_id = ?', [id, userId]);
  if (!todo) return res.status(404).json({ error: 'Todo not found' });

  log(db, userId, 'todo_deleted', 'todo', id, `Deleted todo: ${todo.title}`);
  db.run('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, userId]);

  res.status(204).end();
});

module.exports = router;
