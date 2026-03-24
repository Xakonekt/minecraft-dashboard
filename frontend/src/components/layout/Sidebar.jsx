import { NavLink, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: 'overview', label: 'Overview', icon: '▣' },
  { to: 'console',  label: 'Console',  icon: '⬛' },
  { to: 'players',  label: 'Players',  icon: '◈' },
];

export function Sidebar({ servers = [] }) {
  const location = useLocation();
  // Extraire le serverId courant depuis l'URL : /serverId/page
  const currentServerId = location.pathname.split('/')[1] || '';

  return (
    <aside className="w-60 bg-mc-panel border-r border-mc-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-mc-border">
        <h1 className="text-lg font-bold text-mc-green tracking-wide">⛏ MC Dashboard</h1>
      </div>

      {/* Liste des serveurs */}
      <div className="p-3 border-b border-mc-border space-y-1">
        <div className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Serveurs</div>
        {servers.map((server) => {
          const isActive = server.id === currentServerId;
          return (
            <NavLink
              key={server.id}
              to={`/${server.id}/overview`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-mc-border text-white'
                  : 'text-gray-400 hover:bg-mc-border/40 hover:text-white'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  server.running ? 'bg-green-400 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="truncate">{server.name}</span>
              <span className="ml-auto text-[10px] text-gray-600 uppercase tracking-wide">
                {server.serverType}
              </span>
            </NavLink>
          );
        })}
      </div>

      {/* Navigation du serveur courant */}
      {currentServerId && (
        <nav className="flex-1 p-3 space-y-1">
          <div className="text-xs text-gray-600 uppercase tracking-wider px-2 mb-2">Navigation</div>
          {NAV_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={`/${currentServerId}/${to}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-mc-border text-white'
                    : 'text-gray-400 hover:bg-mc-border/40 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="p-4 border-t border-mc-border text-xs text-gray-600 text-center">
        minecraft-dashboard v2.0
      </div>
    </aside>
  );
}
