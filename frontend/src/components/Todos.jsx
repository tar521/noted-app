import { useState, useEffect } from 'react';
import { api } from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function TodoCard({ todo, onToggle, onDelete, onUpdate, config }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [tagInput, setTagInput] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(todo.description || '');

  function saveDescription() {
    onUpdate(todo.id, { description: editDesc.trim() || null });
    setEditingDesc(false);
  }

  function saveTitle() {
    if (editTitle.trim() && editTitle !== todo.title) onUpdate(todo.id, { title: editTitle.trim() });
    setEditing(false);
  }

  function addTag(e) {
    if (e.key === 'Enter' && tagInput.trim()) {
      const tag = tagInput.trim().toLowerCase();
      // Ensure tags is treated as an array
      const currentTags = Array.isArray(todo.tags) ? todo.tags : [];
      if (!currentTags.includes(tag)) {
        onUpdate(todo.id, { tags: [...currentTags, tag] });
      }
      setTagInput('');
    }
  }

  function removeTag(tag) {
    onUpdate(todo.id, { tags: todo.tags.filter(t => t !== tag) });
  }

  return (
    <div
      className={`group rounded-xl border transition-all duration-200 ${todo.completed ? 'opacity-100' : ''}`}
      style={{ background: config.PRIORITY_BGS[todo.priority], borderColor: todo.completed ? '#2e2e37' : config.PRIORITY_COLORS[todo.priority] + '40' }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(todo.id, todo.completed !== 1)
          }}
          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
          style={{ borderColor: config.PRIORITY_COLORS[todo.priority], background: todo.completed === 1 ? config.PRIORITY_COLORS[todo.priority] : 'transparent' }}
        >
          {todo.completed === 1 && <span className="text-surface-0 text-xs">✓</span>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              className="w-full bg-surface-2 rounded px-2 py-0.5 text-sm text-ink outline-none border border-accent"
            />
          ) : (
            <p
              className={`text-sm text-ink cursor-pointer ${todo.completed === 1 ? 'line-through text-ink-muted' : ''}`}
              onDoubleClick={() => setEditing(true)}
            >{todo.title}</p>
          )}
          
          {/* Description Section */}
          <div className="mt-1">
            {editingDesc ? (
              <textarea
                autoFocus
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                onBlur={saveDescription}
                placeholder="Add a description..."
                className="w-full bg-surface-2 rounded px-2 py-1 text-xs text-ink outline-none border border-surface-4 resize-none"
                rows="2"
              />
            ) : (
              <p 
                className="text-xs text-ink hover:text-ink-muted cursor-pointer italic"
                onClick={() => setEditingDesc(true)}
              >
                {todo.description || "+ Add details"}
              </p>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Priority badge */}
            <select
              value={todo.priority}
              onChange={e => onUpdate(todo.id, { priority: e.target.value })}
              className="text-xs px-2 py-0.5 rounded-full border outline-none bg-surface-2 cursor-pointer"
              style={{ color: config.PRIORITY_COLORS[todo.priority], borderColor: config.PRIORITY_COLORS[todo.priority] + '60' }}
            >
              {config.PRIORITY_LIST.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>

            {/* Due date */}
            <input
              type="date"
              value={todo.due_date || ''}
              onChange={e => onUpdate(todo.id, { due_date: e.target.value || null })}
              className="text-xs bg-surface-2 border border-surface-3 rounded-full px-2 py-0.5 text-ink-muted outline-none cursor-pointer"
            />

            {/* Tags */}
            {Array.isArray(todo.tags) && todo.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-surface-3 text-ink-muted rounded-full px-2 py-0.5">
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-priority-urgent text-ink-faint">×</button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="+ tag"
              className="text-xs bg-transparent text-ink-faint outline-none w-12 placeholder:text-ink-faint"
            />
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={() => onDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-priority-urgent text-xs transition-all shrink-0"
        >✕</button>
      </div>
    </div>
  );
}

export default function Todos({ config, setConfig }) {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all'); // all | active | completed
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState(config.PRIORITY_LIST["medium"]);
  const [newDue, setNewDue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [showPriorityManager, setShowPriorityManager] = useState(false);
  const [newPName, setNewPName] = useState('');
  const [newPColor, setNewPColor] = useState('#6366f1');

  // New state that persists to localStorage
  const [hideCompleted, setHideCompleted] = useState(() => {
    return localStorage.getItem('hideCompletedTodos') === 'true';
  });

  // Function to add a new priority
  const addCustomPriority = async () => {
    if (!newPName.trim()) return;
    const key = newPName.trim().toLowerCase();
    
    // 1. Update List
    const newList = [...config.PRIORITY_LIST, key];
    await api.updateConfig('PRIORITY_LIST', newList);

    // 2. Update Colors
    const newColors = { ...config.PRIORITY_COLORS, [key]: newPColor };
    await api.updateConfig('PRIORITY_COLORS', newColors);

    // 3. Update Backgrounds
    const newBackgrounds = { ...config.PRIORITY_BGS, [key]: `${newPColor}1a` };
    await api.updateConfig('PRIORITY_BGS', newBackgrounds);

    // 4. Refresh local state
    setConfig({ PRIORITY_LIST: newList, PRIORITY_COLORS: newColors, PRIORITY_BGS: newBackgrounds });
    setNewPName('');
  };

  useEffect(() => { api.getTodos().then(setTodos); }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('hideCompletedTodos', hideCompleted);
  }, [hideCompleted]);

  async function createTodo(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const todo = await api.createTodo({ title: newTitle.trim(), priority: newPriority, due_date: newDue || null, description: newDescription.trim() || null });
    setTodos(prev => [todo, ...prev]);
    setNewTitle(''); 
    setNewDue(''); 
    setNewPriority(config.PRIORITY_LIST["medium"]); 
    setNewDescription('');
    setShowForm(false);
  }

  async function toggleTodo(id, completed) {
    // Ensure we send 0 or 1 to the API for SQLite compatibility
    const numericStatus = completed ? 1 : 0;
    const updated = await api.updateTodo(id, { completed: numericStatus });
    
    // Update the list with the response from the server
    setTodos(prev => prev.map(t => t.id === id ? updated : t));
  }

  async function deleteTodo(id) {
    try {
      // This will now succeed without throwing a SyntaxError
      await api.deleteTodo(id);
      
      // Remove from UI immediately
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete todo.");
    }
  }

  async function updateTodo(id, data) {
    const updated = await api.updateTodo(id, data);
    setTodos(prev => prev.map(t => t.id === id ? updated : t));
  }

  async function onDragEnd(result) {
    // If dropped outside the list, do nothing
    if (!result.destination) return;

    // Reorder the local array
    const items = Array.from(todos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 1. Optimistic UI update
    setTodos(items);

    // 2. Persist to backend using the new order_index logic
    try {
      const ids = items.map(todo => todo.id);
      await api.reorderTodos(ids);
    } catch (err) {
      console.error("Failed to save new order:", err);
      // Optional: Refresh from server if the update fails
      api.getTodos().then(setTodos);
    }
  }

  const filtered = todos.filter(t => {
    // 1. If "Hide Completed" is ON and we are in "all" view, filter out finished tasks
    if (hideCompleted && filter === 'all' && t.completed === 1) return false;
    
    // 2. Existing filters
    if (filter === 'active' && t.completed === 1) return false;
    if (filter === 'completed' && t.completed === 0) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    
    return true;
  });

  const counts = { 
    active: todos.filter(t => t.completed === 0 || !t.completed).length, 
    completed: todos.filter(t => t.completed === 1).length 
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-white">Todos</h1>
            <p className="text-ink-muted text-sm mt-1">{counts.active} remaining · {counts.completed} done</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-surface-0 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>+</span> New Todo
          </button>
          {/* Priority Manager Toggle */}
          <button 
            onClick={() => setShowPriorityManager(!showPriorityManager)}
            className="text-xs text-ink-faint hover:text-ink transition-colors"
          >
            ⚙ Manage Priorities
          </button>

          {showPriorityManager && (
            <div className="mb-6 p-4 bg-surface-2 border border-dashed border-surface-4 rounded-xl flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-ink-faint block mb-1">Priority Name</label>
                <input 
                  value={newPName}
                  onChange={e => setNewPName(e.target.value)}
                  className="w-full bg-surface-3 rounded px-2 py-1 text-sm text-ink outline-none"
                  placeholder="e.g. Side Project"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-ink-faint block mb-1">Color</label>
                <input 
                  type="color" 
                  value={newPColor}
                  onChange={e => setNewPColor(e.target.value)}
                  className="h-8 w-12 bg-transparent cursor-pointer"
                />
              </div>
              <button 
                onClick={addCustomPriority}
                className="bg-accent text-surface-0 px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* New todo form */}
        {showForm && (
          <form onSubmit={createTodo} className="mb-6 p-4 bg-surface-2 border border-surface-3 rounded-xl space-y-3">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-surface-3 border border-surface-4 rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent"
            />
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="Details..."
              className="w-full bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-accent"
              rows="2"
            />
            <div className="flex gap-3 flex-wrap">
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
                className="bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer"
              >
                {config.PRIORITY_LIST.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} priority</option>)}
              </select>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                className="bg-surface-3 border border-surface-4 rounded-lg px-3 py-2 text-sm text-ink outline-none cursor-pointer flex-1"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-accent text-surface-0 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Add Todo</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-surface-3 text-ink-muted py-2 rounded-lg text-sm hover:bg-surface-4 transition-colors">Cancel</button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-2">
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${filter === f ? 'bg-accent-glow text-accent' : 'text-ink-muted hover:text-ink hover:bg-surface-2'}`}
            >{f}</button>
          ))}
          <span className="w-px h-4 bg-surface-3" />
          {config.PRIORITY_LIST.map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                  ${priorityFilter === p ? 'bg-surface-3 text-ink' : 'text-ink-faint hover:text-ink-muted'}`}
                style={priorityFilter === p && p !== 'all' ? { color: config.PRIORITY_COLORS[p] } : {}}
              >{p === 'all' ? 'All priorities' : p}</button>
            ))}
            {/* New Hide Toggle */}
            <button 
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hideCompleted ? 'bg-priority-urgent/10 text-priority-urgent' : 'bg-surface-3 text-ink-muted'
              }`}
            >
              {hideCompleted ? '✕ Hiding Completed' : '👁 Showing All'}
            </button>
          </div>
        </div>


        {/* Todo list */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="todo-list">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef} 
                className="space-y-3"
              >
                {filtered.map((todo, index) => (
                  <Draggable key={todo.id} draggableId={String(todo.id)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={snapshot.isDragging ? 'z-50' : ''}
                      >
                        <TodoCard 
                          todo={todo} 
                          onToggle={toggleTodo} 
                          onDelete={deleteTodo} 
                          onUpdate={updateTodo} 
                          config={config}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
