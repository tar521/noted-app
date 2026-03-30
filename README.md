# Noted 📓

A personal notes and todo tracker. Dark, minimal, fast. Built with React + Vite (frontend) and Express + SQLite (backend).

---

## Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Install root dependencies
```bash
npm install
```

### 2. Install backend dependencies
```bash
cd backend && npm install && cd ..
```

### 3. Install frontend dependencies
```bash
cd frontend && npm install && cd ..
```

---

## Running the app

From the root directory:

```bash
npm run dev
```

This starts:
- **Backend** → `http://localhost:3001` (Express + SQLite)
- **Frontend** → `http://localhost:5173` (React + Vite)

Open your browser to **http://localhost:5173**

---

## Data

Your notes and todos are stored in `backend/data/noted.db` — a single SQLite file on your local machine. Back it up anytime by copying that file.

---

## Features

- **Dashboard** — Greeting, stats, recent notes grid, active todos
- **Notes** — Folder-based organization, rich text editor (bold, italic, headings, lists, code blocks), auto-save
- **Todos** — Priority levels (high/medium/low), due dates, tags, filters, inline editing

---

## Keyboard shortcuts (in notes editor)

| Action | Shortcut |
|---|---|
| Bold | `Ctrl/Cmd + B` |
| Italic | `Ctrl/Cmd + I` |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |
| Heading 1 | Toolbar |
| Code block | Toolbar |

---

## Project structure

```
noted-app/
├── package.json          # Root: runs both servers with concurrently
├── backend/
│   ├── server.js         # Express entry point (port 3001)
│   ├── db.js             # SQLite setup + schema
│   ├── data/             # noted.db lives here (auto-created)
│   └── routes/
│       ├── folders.js
│       ├── notes.js
│       └── todos.js
└── frontend/
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js
    │   ├── index.css
    │   └── components/
    │       ├── Sidebar.jsx
    │       ├── Dashboard.jsx
    │       ├── Notes.jsx
    │       ├── NoteEditor.jsx
    │       └── Todos.jsx
```
