import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Overview', icon: '▣' },
  { to: '/console', label: 'Console', icon: '⬛' },
  { to: '/players', label: 'Players', icon: '◈' },
];

export function Sidebar({ serverRunning }) {
  return (
    <aside className="w-60 bg-mc-panel border-r border-mc-border flex flex-col shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-mc-border">
        <h1 className="text-lg font-bold text-mc-green tracking-wide">⛏ MC Dashboard</h1>
        <div
          className={`mt-2 flex items-center gap-2 text-xs font-medium ${
            serverRunning ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              serverRunning ? 'bg-green-400 animate-pulse' : 'bg-red-500'
            }`}
          />
          {serverRunning ? 'Server Online' : 'Server Offline'}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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

      <div className="p-4 border-t border-mc-border text-xs text-gray-600 text-center">
        minecraft-dashboard v1.0
      </div>
    </aside>
  );
}
