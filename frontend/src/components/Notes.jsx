import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import NoteEditor from './NoteEditor';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Notes({ folders, activeFolder, setActiveFolder, activeNote, setActiveNote }) {
  const [notes, setNotes] = useState([]);
  const [noteContent, setNoteContent] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  // Load notes for selected folder
  useEffect(() => {
    if (!activeFolder) { setNotes([]); return; }
    api.getNotes({ folder_id: activeFolder.id }).then(setNotes);
  }, [activeFolder]);

  // Load full note when selected
  useEffect(() => {
    if (!activeNote) { setNoteContent(null); setNoteTitle(''); return; }
    api.getNote(activeNote.id).then(n => {
      setNoteTitle(n.title);
      try { setNoteContent(typeof n.content === 'string' ? JSON.parse(n.content) : n.content); }
      catch { setNoteContent(null); }
    });
  }, [activeNote?.id]);

  // Auto-save with debounce
  const save = useCallback(async (title, content) => {
    if (!activeNote) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await api.updateNote(activeNote.id, { title, content });
      setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title, updated_at: new Date().toISOString() } : n));
      setSaving(false);
    }, 800);
  }, [activeNote]);

  async function createNote() {
    if (!activeFolder) return;
    const note = await api.createNote({ folder_id: activeFolder.id, title: 'Untitled' });
    setNotes(prev => [note, ...prev]);
    setActiveNote(note);
  }

  async function deleteNote(e, id) {
    e.stopPropagation();
    await api.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNote?.id === id) setActiveNote(null);
  }

  return (
    <div className="flex h-full">
      {/* Left panel: folder list + note list */}
      <div className="w-64 border-r border-surface-3 flex flex-col shrink-0 bg-surface-1">
        {/* Folder picker */}
        <div className="px-3 py-3 border-b border-surface-3">
          <p className="text-xs text-ink-faint uppercase tracking-widest mb-2 px-1">Folder</p>
          <div className="space-y-0.5">
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFolder(f); setActiveNote(null); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
                  ${activeFolder?.id === f.id ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            {folders.length === 0 && <p className="text-xs text-ink-faint px-3 py-2">No folders yet — create one in the sidebar</p>}
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-ink-faint uppercase tracking-widest">Notes</span>
            {activeFolder && (
              <button onClick={createNote} className="text-ink-faint hover:text-accent text-lg leading-none transition-colors" title="New note">+</button>
            )}
          </div>
          {!activeFolder && (
            <p className="text-sm text-ink-faint px-4 py-2">Select a folder to see notes</p>
          )}
          <div className="px-2 space-y-0.5 pb-4">
            {notes.map(note => (
              <button
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={`group w-full text-left px-3 py-2.5 rounded-lg transition-all
                  ${activeNote?.id === note.id ? 'bg-surface-3' : 'hover:bg-surface-2'}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className={`text-sm truncate ${activeNote?.id === note.id ? 'text-ink' : 'text-ink-muted'}`}>{note.title || 'Untitled'}</p>
                  <button onClick={e => deleteNote(e, note.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-priority-urgent text-xs shrink-0 transition-all">✕</button>
                </div>
                <p className="text-xs text-ink-faint mt-0.5">{timeAgo(note.updated_at)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeNote ? (
          <>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-3 bg-surface-1">
              <input
                value={noteTitle}
                onChange={e => { setNoteTitle(e.target.value); save(e.target.value, noteContent); }}
                className="flex-1 bg-transparent text-lg font-display font-light text-white outline-none placeholder:text-ink-faint"
                placeholder="Note title…"
              />
              <span className="text-xs text-ink-faint">{saving ? 'Saving…' : 'Saved'}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <NoteEditor
                key={activeNote.id}
                content={noteContent}
                onChange={content => { setNoteContent(content); save(noteTitle, content); }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <span className="text-5xl opacity-20">◈</span>
            <div>
              <p className="text-ink-muted text-sm">{activeFolder ? 'Select a note or create one' : 'Select a folder to get started'}</p>
              {activeFolder && (
                <button onClick={createNote} className="mt-3 px-4 py-2 bg-accent text-surface-0 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                  + New Note
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
