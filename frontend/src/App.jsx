import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Overview } from './components/Overview.jsx';
import { Console } from './components/Console.jsx';
import { Players } from './components/Players.jsx';
import { useServer } from './hooks/useServer.js';
import { api } from './api/client.js';

function ServerLayout() {
  const { serverId } = useParams();
  const { status, loading, refresh } = useServer(serverId, 5000);

  return (
    <main className="flex-1 overflow-auto flex flex-col">
      {loading && !status ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Connexion au serveur...
        </div>
      ) : (
        <Routes>
          <Route path="overview" element={<Overview status={status} onRefresh={refresh} />} />
          <Route path="console"  element={<Console />} />
          <Route path="players"  element={<Players />} />
          <Route path="*"        element={<Navigate to="overview" replace />} />
        </Routes>
      )}
    </main>
  );
}

export default function App() {
  const [servers, setServers] = useState([]);
  const [loadingServers, setLoadingServers] = useState(true);

  const fetchServers = () =>
    api.getServers()
      .then(setServers)
      .catch(() => {});

  useEffect(() => {
    fetchServers().finally(() => setLoadingServers(false));
    const id = setInterval(fetchServers, 10_000);
    return () => clearInterval(id);
  }, []);

  if (loadingServers) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Connexion à l'agent...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar servers={servers} />

        <Routes>
          {servers.length > 0 ? (
            <>
              <Route path="/" element={<Navigate to={`/${servers[0].id}/overview`} replace />} />
              <Route path="/:serverId/*" element={<ServerLayout />} />
            </>
          ) : (
            <Route
              path="*"
              element={
                <main className="flex-1 flex items-center justify-center text-gray-500">
                  Aucun serveur configuré — vérifie{' '}
                  <code className="ml-1 text-mc-green">servers.json</code>
                </main>
              }
            />
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
