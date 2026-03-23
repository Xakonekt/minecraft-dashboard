import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Overview } from './components/Overview.jsx';
import { Console } from './components/Console.jsx';
import { Players } from './components/Players.jsx';
import { useServer } from './hooks/useServer.js';

export default function App() {
  const { status, loading, refresh } = useServer(5000);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar serverRunning={status?.container?.running} />

        <main className="flex-1 overflow-auto flex flex-col">
          {loading && !status ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Connecting to agent...
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Overview status={status} onRefresh={refresh} />} />
              <Route path="/console" element={<Console />} />
              <Route path="/players" element={<Players />} />
            </Routes>
          )}
        </main>
      </div>
    </BrowserRouter>
  );
}
