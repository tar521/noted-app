import { useState, useEffect } from 'react';
import { api } from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PRIORITY_LIST, PRIORITY_COLORS, PRIORITY_BG } from '../constants/priorities';

const COLUMNS = ['Not Started', 'In Progress', 'Paused', 'Peer Review', 'Merged/Completed'];

function KanbanCard({ todo }) {
  return (
    <div
      className="group bg-surface-2 border border-surface-3 rounded-lg p-3 shadow-sm hover:border-surface-4 transition-all"
      style={{ borderLeft: `4px solid ${PRIORITY_COLORS[todo.priority]}` }}
    >
      <p className={`text-sm text-ink mb-2 ${todo.completed ? 'line-through text-ink-muted' : ''}`}>
        {todo.title}
      </p>
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {todo.tags && todo.tags.map(tag => (
            <span key={tag} className="text-[10px] bg-surface-3 text-ink-faint px-1.5 py-0.5 rounded">#{tag}</span>
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

export default function Kanban() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

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
      </div>

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
                {['all', ...PRIORITY_LIST].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                        ${priorityFilter === p ? 'bg-surface-3 text-ink' : 'text-ink-faint hover:text-ink-muted'}`}
                      style={priorityFilter === p && p !== 'all' ? { color: PRIORITY_COLORS[p] } : {}}
                    >{p === 'all' ? 'All priorities' : p}</button>
                  ))}
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
                              <KanbanCard todo={todo} />
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
    </div>
  );
}
