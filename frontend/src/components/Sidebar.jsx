import { useState } from 'react';
import { api } from '../api';

const FOLDER_COLORS = ['#6366f1','#a78bfa','#f472b6','#34d399','#fb923c','#60a5fa','#facc15','#f87171'];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'notes', label: 'Notes', icon: '◈' },
  { id: 'todos', label: 'Todos', icon: '◉' },
  { id: 'kanban', label: 'Kanban', icon: '⬚' },
  { id: 'history', label: 'History', icon: '◷' },
];

export default function Sidebar({ tab, setTab, folders, setFolders, activeFolder, setActiveFolder, activeNote, setActiveNote }) {
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [pickedColor, setPickedColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');

  async function createFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const folder = await api.createFolder({ name: newFolderName.trim(), color: pickedColor });
    setFolders(f => [...f, folder]);
    setNewFolderName('');
    setShowNewFolder(false);
    setPickedColor(FOLDER_COLORS[0]);
  }

  async function deleteFolder(e, id) {
    e.stopPropagation();
    await api.deleteFolder(id);
    setFolders(f => f.filter(x => x.id !== id));
    if (activeFolder?.id === id) { setActiveFolder(null); setActiveNote(null); }
  }

  async function saveEditFolder(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    const updated = await api.updateFolder(editingFolder.id, { name: editName.trim() });
    setFolders(f => f.map(x => x.id === updated.id ? updated : x));
    setEditingFolder(null);
  }

  return (
    <aside className="flex flex-col h-full w-60 bg-surface-1 border-r border-surface-3 shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-3">
        <span className="font-display text-2xl font-light text-white tracking-wide italic">Noted</span>
      </div>

      {/* Main nav */}
      <nav className="px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); if (item.id !== 'notes') setActiveFolder(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
              ${tab === item.id
                ? 'bg-accent-glow text-accent font-medium'
                : 'text-ink-muted hover:text-ink hover:bg-surface-2'}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Folders section */}
      <div className="px-3 mt-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-xs font-medium text-ink-faint uppercase tracking-widest">Folders</span>
          <button
            onClick={() => setShowNewFolder(v => !v)}
            className="text-ink-faint hover:text-accent text-lg leading-none transition-colors"
            title="New folder"
          >+</button>
        </div>

        {showNewFolder && (
          <form onSubmit={createFolder} className="mb-3 px-1 space-y-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent"
            />
            <div className="flex gap-1.5 flex-wrap">
              {FOLDER_COLORS.map(c => (
                <button type="button" key={c} onClick={() => setPickedColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${pickedColor === c ? 'scale-125 ring-2 ring-white/30' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-accent text-surface-0 text-xs font-medium py-1.5 rounded-lg hover:opacity-90 transition-opacity">Create</button>
              <button type="button" onClick={() => setShowNewFolder(false)} className="flex-1 bg-surface-3 text-ink-muted text-xs py-1.5 rounded-lg hover:bg-surface-4 transition-colors">Cancel</button>
            </div>
          </form>
        )}

        <div className="space-y-0.5">
          {folders.map(folder => (
            <div key={folder.id}>
              {editingFolder?.id === folder.id ? (
                <form onSubmit={saveEditFolder} className="px-1 mb-1">
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-surface-2 border border-accent rounded-lg px-2 py-1 text-sm text-ink outline-none"
                    onBlur={() => setEditingFolder(null)}
                  />
                </form>
              ) : (
                <button
                  onClick={() => { setTab('notes'); setActiveFolder(folder); setActiveNote(null); }}
                  onDoubleClick={() => { setEditingFolder(folder); setEditName(folder.name); }}
                  className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                    ${activeFolder?.id === folder.id && tab === 'notes'
                      ? 'bg-surface-3 text-ink'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-2'}`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: folder.color }} />
                  <span className="truncate flex-1 text-left">{folder.name}</span>
                  <span
                    onClick={(e) => deleteFolder(e, folder.id)}
                    className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-priority-urgent text-xs transition-all cursor-pointer"
                  >✕</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-3">
        <p className="text-xs text-ink-faint">Double-click folder to rename</p>
      </div>
    </aside>
  );
}
