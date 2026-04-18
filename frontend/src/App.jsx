import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Notes from './components/Notes';
import Todos from './components/Todos';
import History from './components/History';
import Kanban from './components/Kanban';
import Login from './components/Login';

export default function App() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState('dashboard');

  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);
  const [activeNote, setActiveNote] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (user) {
      Promise.all([api.getFolders(), api.getConfig()]).then(([foldersData, configData]) => {
        setFolders(foldersData);
        setConfig(configData);
      }).catch(err => {
        console.error("Failed to fetch initial data:", err);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-accent animate-pulse font-display text-xl italic">Loading Noted...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar
        tab={tab}
        setTab={setTab}
        folders={folders}
        setFolders={setFolders}
        activeFolder={activeFolder}
        setActiveFolder={setActiveFolder}
        activeNote={activeNote}
        setActiveNote={setActiveNote}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {tab === 'dashboard' && (
          <Dashboard
            folders={folders}
            setTab={setTab}
            setActiveFolder={setActiveFolder}
            setActiveNote={setActiveNote}
            config={config}
          />
        )}
        {tab === 'notes' && (
          <Notes
            folders={folders}
            activeFolder={activeFolder}
            setActiveFolder={setActiveFolder}
            activeNote={activeNote}
            setActiveNote={setActiveNote}
          />
        )}
        {tab === 'todos' && <Todos config={config} setConfig={setConfig} />}
        {tab === 'kanban' && <Kanban config={config} />}
        {tab === 'history' && <History />}
      </main>
    </div>
  );
}
