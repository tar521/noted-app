import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import NoteEditor from './NoteEditor';
import { jsonToMarkdown, jsonToPlainText } from '../utils/markdown';
import JSZip from 'jszip';

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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('md');
  const saveTimer = useRef(null);

  // Load notes for selected folder
  useEffect(() => {
    if (!activeFolder) { setNotes([]); return; }
    api.getNotes({ folder_id: activeFolder.id }).then(setNotes);
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
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
    if (selectedNoteIds.has(id)) {
      const next = new Set(selectedNoteIds);
      next.delete(id);
      setSelectedNoteIds(next);
    }
  }

  const toggleNoteSelection = (e, id) => {
    e.stopPropagation();
    const next = new Set(selectedNoteIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedNoteIds(next);
  };

  const exportSingleNote = async (note, title, content) => {
    const text = exportFormat === 'md' ? jsonToMarkdown(content) : jsonToPlainText(content);
    const blob = new Blob([text], { type: exportFormat === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Untitled'}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotes = async (notesToExport, fileName) => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      for (const note of notesToExport) {
        const fullNote = await api.getNote(note.id);
        const content = typeof fullNote.content === 'string' ? JSON.parse(fullNote.content) : fullNote.content;
        const text = exportFormat === 'md' ? jsonToMarkdown(content) : jsonToPlainText(content);
        zip.file(`${fullNote.title || 'Untitled'}.${exportFormat}`, text);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <span className="text-xs text-ink-faint uppercase tracking-widest">Notes</span>
            <div className="flex items-center gap-2">
              {activeFolder && notes.length > 0 && (
                <button
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  className={`text-sm transition-colors ${isSelectionMode ? 'text-accent' : 'text-ink-faint hover:text-ink'}`}
                  title="Selection Mode"
                >
                  {isSelectionMode ? 'Done' : 'Select'}
                </button>
              )}
              {activeFolder && !isSelectionMode && (
                <button onClick={createNote} className="text-ink-faint hover:text-accent text-lg leading-none transition-colors" title="New note">+</button>
              )}
            </div>
          </div>
          {!activeFolder && (
            <p className="text-sm text-ink-faint px-4 py-2">Select a folder to see notes</p>
          )}
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
            {notes.map(note => (
              <button
                key={note.id}
                onClick={() => isSelectionMode ? toggleNoteSelection({ stopPropagation: () => {} }, note.id) : setActiveNote(note)}
                className={`group w-full text-left px-3 py-2.5 rounded-lg transition-all relative
                  ${activeNote?.id === note.id ? 'bg-surface-3' : 'hover:bg-surface-2'}
                  ${selectedNoteIds.has(note.id) ? 'ring-1 ring-accent bg-accent-glow/5' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {isSelectionMode && (
                      <div
                        onClick={(e) => toggleNoteSelection(e, note.id)}
                        className={`mt-1 w-4 h-4 rounded border shrink-0 transition-all flex items-center justify-center
                          ${selectedNoteIds.has(note.id) ? 'bg-accent border-accent text-surface-0' : 'border-surface-4 hover:border-ink-faint'}`}
                      >
                        {selectedNoteIds.has(note.id) && <span className="text-[10px]">✓</span>}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${activeNote?.id === note.id ? 'text-ink' : 'text-ink-muted'}`}>{note.title || 'Untitled'}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{timeAgo(note.updated_at)}</p>
                    </div>
                  </div>
                  {!isSelectionMode && (
                    <button onClick={e => deleteNote(e, note.id)} className="opacity-0 group-hover:opacity-100 text-ink-faint hover:text-priority-urgent text-xs shrink-0 transition-all">✕</button>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          {isSelectionMode && (
            <div className="p-3 border-t border-surface-3 bg-surface-1 shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-2 p-1 bg-surface-2 rounded-lg">
                <button
                  onClick={() => setExportFormat('md')}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${exportFormat === 'md' ? 'bg-surface-4 text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                >Markdown</button>
                <button
                  onClick={() => setExportFormat('txt')}
                  className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${exportFormat === 'txt' ? 'bg-surface-4 text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                >Plain Text</button>
              </div>
              <button
                disabled={isExporting || (selectedNoteIds.size === 0 && notes.length === 0)}
                onClick={() => {
                  const toExport = selectedNoteIds.size > 0
                    ? notes.filter(n => selectedNoteIds.has(n.id))
                    : notes;
                  exportNotes(toExport, selectedNoteIds.size > 0 ? 'selected_notes' : activeFolder.name);
                }}
                className="w-full py-2 bg-accent text-surface-0 text-xs font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isExporting ? 'Exporting...' : `Export ${selectedNoteIds.size || 'All'} (${exportFormat.toUpperCase()})`}
              </button>
              {selectedNoteIds.size > 0 && (
                <p className="text-[10px] text-center text-ink-faint">{selectedNoteIds.size} notes selected</p>
              )}
            </div>
          )}
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
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-surface-2 rounded-lg p-0.5 border border-surface-3">
                  <button
                    onClick={() => setExportFormat('md')}
                    className={`px-2 py-0.5 text-[10px] rounded ${exportFormat === 'md' ? 'bg-surface-4 text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                  >MD</button>
                  <button
                    onClick={() => setExportFormat('txt')}
                    className={`px-2 py-0.5 text-[10px] rounded ${exportFormat === 'txt' ? 'bg-surface-4 text-ink shadow-sm' : 'text-ink-faint hover:text-ink'}`}
                  >TXT</button>
                </div>
                <button
                  onClick={() => exportSingleNote(activeNote, noteTitle, noteContent)}
                  className="text-ink-faint hover:text-accent transition-colors"
                  title={`Export to ${exportFormat === 'md' ? 'Markdown' : 'Plain Text'}`}
                >
                  <span className="text-lg">⭳</span>
                </button>
                <span className="text-xs text-ink-faint shrink-0">{saving ? 'Saving…' : 'Saved'}</span>
              </div>
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
