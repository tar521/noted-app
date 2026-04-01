import { useState, useEffect } from 'react';
import { api } from '../api';
import { PRIORITY_COLORS, PRIORITY_BG } from '../constants/priorities';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0) return { label: 'Overdue', color: '#f87171' };
  if (diff === 0) return { label: 'Due today', color: '#fb923c' };
  if (diff === 1) return { label: 'Due tomorrow', color: '#facc15' };
  return { label: `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: '#9090a8' };
}

export default function Dashboard({ folders, setTab, setActiveFolder, setActiveNote }) {
  const [recentNotes, setRecentNotes] = useState([]);
  const [activeTodos, setActiveTodos] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [hideCompleted, setHideCompleted] = useState(() => {
    return localStorage.getItem('hideCompletedDashboard') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hideCompletedDashboard', hideCompleted);
  }, [hideCompleted]);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    api.getNotes({ limit: 6 }).then(data => setRecentNotes(Array.isArray(data) ? data : []));
    api.getTodos({ completed: false }).then(data => setActiveTodos(Array.isArray(data) ? data.filter(todo => todo.completed === 0) : []));
  }, []);

  async function toggleTodo(id, currentStatus) {
    // SQLite uses 0/1, so we flip it here
    const nextStatus = currentStatus === 1 ? 0 : 1;
    
    // 1. Update the API
    await api.updateTodo(id, { completed: nextStatus });
    
    // 2. Update local state so the UI changes immediately
    // Change 'setTodos' to 'setActiveTodos'
    // If we are on the Dashboard showing "Active" todos, 
    // we should remove the item if it was just completed.
    setActiveTodos(prev => {
      if (nextStatus === 1) {
        // Remove it from the "Active" list
        return prev.filter(t => t.id !== id);
      } else {
        // This case shouldn't happen much on Dashboard, but for safety:
        return prev.map(t => t.id === id ? { ...t, completed: nextStatus } : t);
      }
    });
  }

  function openNote(note) {
    const folder = folders.find(f => f.id === note.folder_id);
    if (folder) setActiveFolder(folder);
    setActiveNote(note);
    setTab('notes');
  }

  const completionRate = activeTodos.length > 0 ? 0 : 100;

  // Filter the list before rendering
  const displayedTodos = hideCompleted 
    ? activeTodos.filter(t => t.completed === 0) 
    : activeTodos;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Hero greeting */}
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light text-white italic">{greeting}</h1>
          <p className="text-ink-muted mt-1">
            {activeTodos.length === 0
              ? 'All caught up — nice work.'
              : `You have ${activeTodos.length} active todo${activeTodos.length !== 1 ? 's' : ''} today.`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Folders', value: folders.length, icon: '▣', color: '#a78bfa' },
            { label: 'Recent Notes', value: recentNotes.length, icon: '◈', color: '#60a5fa' },
            { label: 'Active Todos', value: activeTodos.length, icon: '◉', color: '#fb923c' },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-2 border border-surface-3 rounded-xl p-5 flex items-center gap-4">
              <span className="text-2xl" style={{ color: stat.color }}>{stat.icon}</span>
              <div>
                <p className="text-2xl font-light text-white">{stat.value}</p>
                <p className="text-xs text-ink-faint">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Recent Notes — wider column */}
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-light text-white">Recent Notes</h2>
              <button onClick={() => setTab('notes')} className="text-xs text-accent hover:underline">View all →</button>
            </div>
            {recentNotes.length === 0 ? (
              <div className="bg-surface-2 border border-surface-3 rounded-xl p-8 text-center">
                <p className="text-ink-faint text-sm">No notes yet</p>
                <button onClick={() => setTab('notes')} className="mt-3 text-xs text-accent hover:underline">Create your first note →</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recentNotes.map(note => {
                  const folder = folders.find(f => f.id === note.folder_id);
                  return (
                    <button
                      key={note.id}
                      onClick={() => openNote(note)}
                      className="text-left bg-surface-2 border border-surface-3 hover:border-surface-4 rounded-xl p-4 transition-all hover:bg-surface-3 group"
                    >
                      {folder && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: folder.color }} />
                          <span className="text-xs text-ink-faint truncate">{folder.name}</span>
                        </div>
                      )}
                      <p className="text-sm text-ink font-medium truncate group-hover:text-white transition-colors">{note.title || 'Untitled'}</p>
                      <p className="text-xs text-ink-faint mt-1">{timeAgo(note.updated_at)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Todos — narrower column */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-light text-white">Todos</h2>
              <button onClick={() => setTab('todos')} className="text-xs text-accent hover:underline">View all →</button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wider">Recent Todos</h2>
              <button 
                onClick={() => setHideCompleted(!hideCompleted)}
                className="text-[10px] uppercase tracking-widest font-bold text-ink-faint hover:text-accent transition-colors"
              >
                {hideCompleted ? 'Show Done' : 'Hide Done'}
              </button>
            </div>
            <div className="space-y-3">
              {activeTodos.length === 0 && (
                <div className="bg-surface-2 border border-surface-3 rounded-xl p-6 text-center">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-ink-faint text-sm">All done!</p>
                </div>
              )}
              {displayedTodos.map(todo => {
                const due = formatDate(todo.due_date);
                return (
                  <div
                    key={todo.id}
                    className="flex items-start gap-3 p-3 rounded-xl border transition-all"
                    style={{ background: PRIORITY_BG[todo.priority], borderColor: PRIORITY_COLORS[todo.priority] + '30' }}
                  >
                    <button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className="mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 hover:scale-110 transition-transform"
                      style={{ borderColor: PRIORITY_COLORS[todo.priority],
                        background: todo.completed === 1 ? PRIORITY_COLORS[todo.priority] : 'transparent'
                       }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink truncate">{todo.title}</p>
                      {due && <p className="text-xs mt-0.5" style={{ color: due.color }}>{due.label}</p>}
                      {Array.isArray(todo.tags) && todo.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {todo.tags.map(tag => (
                            <span key={tag} className="text-xs text-ink-faint">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
