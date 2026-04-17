import { useState, useEffect } from 'react';
import { api } from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PRIORITY_LIST, PRIORITY_COLORS, PRIORITY_BG } from '../constants/priorities';

const COLUMNS = ['Not Started', 'In Progress', 'Paused', 'Peer Review', 'Merged/Completed'];

function KanbanCard({ todo, onUpdate, onOpen, config }) {
  const [isEditing, setIsEditing] = useState(false);
  const [desc, setDesc] = useState(todo.description || '');

  // Keep local state in sync if todo changes from outside
  useEffect(() => {
    setDesc(todo.description || '');
  }, [todo.description]);

  const saveDescription = () => {
    if (desc !== (todo.description || '')) {
      onUpdate(todo.id, { description: desc.trim() || null });
    }
    setIsEditing(false);
  };

  return (
    <div
      onDoubleClick={onOpen}
      className="group bg-surface-2 border border-surface-3 rounded-lg p-3 shadow-sm hover:border-surface-4 transition-all"
      style={{ borderLeft: `4px solid ${config.PRIORITY_COLORS[todo.priority]}` }}
    >
      <p className={`text-[16px] text-ink mb-2 ${todo.completed ? 'line-through text-ink-muted' : ''}`}>
        {todo.title}
      </p>

      {/* Description Section */}
      <div className="mb-3">
        {isEditing ? (
          <textarea
            autoFocus
            className="w-full bg-surface-3 border border-accent/30 rounded p-1.5 text-xs text-ink outline-none resize-none"
            rows="2"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveDescription();
              }
            }}
          />
        ) : (
          <p
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="text-[12px] text-ink-faint hover:text-ink-muted cursor-text italic line-clamp-2 min-h-[1.5em]"
          >
            {todo.description || "+ Add details"}
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {todo.tags && todo.tags.map(tag => (
            <span key={tag} className={`text-[12px] bg-surface-1 ${todo.completed ? 'line-through text-ink-faint px-1.5 py-0.5 rounded' : 'text-ink-muted px-1.5 py-0.5 rounded'}`}>#{tag}</span>
          ))}
        </div>
        {todo.due_date && (
          <span className="text-[10px] text-ink-faint whitespace-nowrap">
            {new Date(todo.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Kanban({ config }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTodo, setSelectedTodo] = useState(null); // Track the open modal  

  const handleUpdate = async (id, updates) => {
    try {
      const updatedTodo = await api.updateTodo(id, updates);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updatedTodo } : t));
    } catch (err) {
      console.error("Failed to update todo:", err);
    }
  };

  useEffect(() => {
    api.getTodos().then(data => {
      // Sort by kanban_order_index
      setTodos(data.sort((a, b) => (a.kanban_order_index || 0) - (b.kanban_order_index || 0)));
      setLoading(false);
    });
  }, []);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // 1. Update local state
    const newTodos = Array.from(todos);
    const draggedTodo = newTodos.find(t => String(t.id) === draggableId);
    
    if (draggedTodo) {
      draggedTodo.status = destination.droppableId;
      draggedTodo.completed = (destination.droppableId === 'Merged/Completed' ? 1 : 0);
      
      // We need to re-sort based on columns and indices to get the new order
      // This is slightly complex locally, so let's rebuild the columns
      const cols = {};
      COLUMNS.forEach(c => cols[c] = newTodos.filter(t => t.status === c && String(t.id) !== draggableId));
      
      // Insert at the new index
      cols[destination.droppableId].splice(destination.index, 0, draggedTodo);
      
      // Flatten back to todos with updated indices
      const flattened = [];
      Object.entries(cols).forEach(([status, items]) => {
        items.forEach((item, idx) => {
          item.kanban_order_index = idx;
          flattened.push(item);
        });
      });
      
      setTodos(flattened);

      // 2. Persist to backend
      try {
        const payload = {};
        Object.entries(cols).forEach(([status, items]) => {
          payload[status] = items.map(i => i.id);
        });
        await api.kanbanReorderTodos(payload);
      } catch (err) {
        console.error("Failed to save kanban order:", err);
        api.getTodos().then(setTodos);
      }
    }
  };

  const filtered = todos.filter(t => {
    
    // 2. Existing filters
    if (filter === 'active' && t.completed === 1) return false;
    if (filter === 'completed' && t.completed === 0) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    
    return true;
  });

  const getColumnItems = (status) => filtered.filter(t => t.status === status);


  if (loading) return <div className="p-8 text-ink-faint">Loading board…</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="p-8 pb-4">
        <h1 className="font-display text-3xl font-light text-white">Kanban Board</h1>
        <p className="text-ink-muted text-sm mt-1">Drag and drop to manage your workflow</p>
      
      {/* Filters */}
        <div className="flex items-center justify-between mt-8 mb-6 flex-wrap gap-4">
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
          </div>
        </div>
      
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 pt-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(column => (
              <div key={column} className="w-72 flex flex-col bg-surface-1/50 rounded-xl border border-surface-3/50">
                {/* Column Header */}
                <div className="p-4 border-b border-surface-3/50 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{column}</h2>
                  <span className="text-[10px] bg-surface-3 text-ink-faint px-2 py-0.5 rounded-full font-medium">
                    {getColumnItems(column).length}
                  </span>
                </div>

                {/* Column Content */}
                <Droppable droppableId={column}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-surface-2/30' : ''}`}
                    >
                      {getColumnItems(column).map((todo, index) => (
                        <Draggable key={todo.id} draggableId={String(todo.id)} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'z-50 shadow-xl' : ''}
                            >
                              <KanbanCard todo={todo} 
                              onUpdate={handleUpdate} 
                              onOpen={() => setSelectedTodo(todo)}
                              config={config} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Render the Modal if a todo is selected */}
      {selectedTodo && (
        <TodoModal 
          todo={selectedTodo} 
          onClose={() => setSelectedTodo(null)} 
          onUpdate={(id, updates) => {
            handleUpdate(id, updates);
            // Keep the modal in sync with the update
            setSelectedTodo(prev => ({ ...prev, ...updates }));
          }}
          config={config}
        />
      )}
    </div>
  );
}

function TodoModal({ todo, onClose, onUpdate, config }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-surface-1 border border-surface-3 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-surface-3 flex justify-between items-start">
          <div className="flex-1">
             <input 
               className="bg-transparent text-2xl font-display text-white outline-none w-full"
               value={todo.title}
               onChange={(e) => onUpdate(todo.id, { title: e.target.value })}
             />
             <div className="flex gap-2 mt-2">
               <span className="text-xs text-ink-faint uppercase tracking-widest">Status:</span>
               <span className="text-xs text-accent font-bold">{todo.status}</span>
             </div>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Detailed Description */}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase block mb-2">Description</label>
            <textarea 
              className="w-full bg-surface-2 border border-surface-3 rounded-xl p-4 text-ink outline-none focus:border-accent/50 transition-all resize-none"
              rows="6"
              placeholder="Add more details about this task..."
              value={todo.description || ''}
              onChange={(e) => onUpdate(todo.id, { description: e.target.value })}
            />
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase block mb-2">Priority</label>
              <select 
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-ink outline-none"
                value={todo.priority}
                onChange={(e) => onUpdate(todo.id, { priority: e.target.value })}
              >
                {config.PRIORITY_LIST.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase block mb-2">Due Date</label>
              <input 
                type="date"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg p-2 text-sm text-ink outline-none"
                value={todo.due_date ? todo.due_date.split('T')[0] : ''}
                onChange={(e) => onUpdate(todo.id, { due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface-2/50 border-t border-surface-3 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-accent-glow text-accent rounded-xl font-medium hover:brightness-110 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
