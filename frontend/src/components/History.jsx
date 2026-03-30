import { useState, useEffect } from 'react';
import { api } from '../api';

const TYPE_CONFIG = {
  todo_completed: { icon: '✓', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)', label: 'Completed' },
  todo_created:   { icon: '＋', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', label: 'Created todo' },
  todo_reopened:  { icon: '↩', color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)',  label: 'Reopened' },
  todo_updated:   { icon: '✎', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', label: 'Updated todo' },
  todo_deleted:   { icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', label: 'Deleted todo' },
  note_created:   { icon: '◈', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', label: 'Created note' },
  note_updated:   { icon: '✎', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', label: 'Edited note' },
  note_deleted:   { icon: '✕', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', label: 'Deleted note' },
};

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function groupByDay(entries) {
  const groups = {};
  for (const entry of entries) {
    const day = new Date(entry.created_at).toDateString();
    if (!groups[day]) groups[day] = { label: formatDay(entry.created_at), entries: [] };
    groups[day].entries.push(entry);
  }
  return Object.values(groups);
}

const FILTERS = [
  { value: 'all',            label: 'All activity' },
  { value: 'todo_completed', label: 'Completions' },
  { value: 'todo_created',   label: 'Created todos' },
  { value: 'note_created',   label: 'Created notes' },
  { value: 'note_updated',   label: 'Note edits' },
  { value: 'todo_deleted',   label: 'Deletions' },
];

export default function History() {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter !== 'all' ? { type: filter, limit: 300 } : { limit: 300 };
    api.getActivity(params).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, [filter]);

  const groups = groupByDay(entries);

  // Summary counts
  const completedCount = entries.filter(e => e.type === 'todo_completed').length;
  const createdCount   = entries.filter(e => e.type === 'todo_created').length;
  const noteCount      = entries.filter(e => e.type === 'note_created').length;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-light text-white">Activity History</h1>
          <p className="text-ink-muted text-sm mt-1">A log of everything you've done in Noted</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Todos completed', value: completedCount, color: '#4ade80' },
            { label: 'Todos created',   value: createdCount,   color: '#60a5fa' },
            { label: 'Notes created',   value: noteCount,      color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 border border-surface-3 rounded-xl p-4 text-center">
              <p className="text-2xl font-light" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-ink-faint mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filter === f.value
                  ? 'bg-accent-glow text-accent'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-2'}`}
            >{f.label}</button>
          ))}
        </div>

        {/* Timeline */}
        {loading && (
          <div className="text-center py-16 text-ink-faint text-sm">Loading…</div>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl opacity-20 mb-3">◎</p>
            <p className="text-ink-muted text-sm">No activity recorded yet</p>
            <p className="text-ink-faint text-xs mt-1">Activity is logged as you create notes and todos</p>
          </div>
        )}

        <div className="space-y-8">
          {groups.map(group => (
            <div key={group.label}>
              {/* Day label */}
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs font-medium text-ink-faint uppercase tracking-widest whitespace-nowrap">{group.label}</p>
                <div className="flex-1 h-px bg-surface-3" />
                <p className="text-xs text-ink-faint">{group.entries.length} event{group.entries.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {group.entries.map(entry => {
                  const cfg = TYPE_CONFIG[entry.type] || { icon: '·', color: '#9090a8', bg: 'rgba(144,144,168,0.08)', border: 'rgba(144,144,168,0.2)', label: entry.type };
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-xl border transition-all"
                      style={{ background: cfg.bg, borderColor: cfg.border }}
                    >
                      {/* Icon */}
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-medium"
                        style={{ background: cfg.border, color: cfg.color }}
                      >{cfg.icon}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink">{entry.label}</p>
                        <p className="text-xs text-ink-faint mt-0.5">{cfg.label}</p>
                      </div>

                      {/* Time */}
                      <p className="text-xs text-ink-faint shrink-0 mt-1">{formatTime(entry.created_at)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}