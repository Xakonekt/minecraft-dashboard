import { useState } from 'react';
import { api } from '../api/client.js';

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className="bg-mc-panel border border-mc-border rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${highlight ?? ''}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function ControlBtn({ label, onClick, variant = 'default', disabled }) {
  const styles = {
    default: 'bg-mc-border hover:bg-mc-border/70',
    green: 'bg-mc-green hover:bg-green-600',
    red: 'bg-red-700 hover:bg-red-600',
    yellow: 'bg-yellow-600 hover:bg-yellow-500',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2 rounded font-medium text-sm transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {label}
    </button>
  );
}

function formatUptime(startedAt) {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function Overview({ status, onRefresh }) {
  const [busy, setBusy] = useState(null);

  const handle = async (action, fn) => {
    setBusy(action);
    try {
      await fn();
      setTimeout(onRefresh, 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const running = status?.container?.running;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overview</h2>
        {status?.serverType && (
          <span className="text-xs px-3 py-1 bg-mc-panel border border-mc-border rounded-full text-gray-400 uppercase tracking-wide">
            {status.serverType}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Status"
          value={running ? 'Online' : 'Offline'}
          sub={status?.container?.status}
          highlight={running ? 'text-green-400' : 'text-red-400'}
        />
        <StatCard
          label="Players"
          value={
            status?.players != null
              ? `${status.players.online} / ${status.players.max}`
              : '—'
          }
        />
        <StatCard
          label="Uptime"
          value={running && status?.container?.startedAt ? formatUptime(status.container.startedAt) : '—'}
        />
        <StatCard
          label="RCON"
          value={status?.rcon ? 'Connected' : 'Disconnected'}
          highlight={status?.rcon ? 'text-green-400' : 'text-yellow-400'}
        />
      </div>

      {/* TPS (only shown if available) */}
      {status?.tps && (
        <div className="bg-mc-panel border border-mc-border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">TPS</div>
          <div className="flex gap-8">
            {status.tps['1m'] != null && (
              <div>
                <div className="text-xs text-gray-500">1 min</div>
                <div className="text-xl font-bold text-green-400">{status.tps['1m'].toFixed(1)}</div>
              </div>
            )}
            {status.tps['5m'] != null && (
              <div>
                <div className="text-xs text-gray-500">5 min</div>
                <div className="text-xl font-bold text-green-400">{status.tps['5m'].toFixed(1)}</div>
              </div>
            )}
            {status.tps['15m'] != null && (
              <div>
                <div className="text-xs text-gray-500">15 min</div>
                <div className="text-xl font-bold text-green-400">{status.tps['15m'].toFixed(1)}</div>
              </div>
            )}
            {status.tps.overall != null && (
              <div>
                <div className="text-xs text-gray-500">Overall</div>
                <div className="text-xl font-bold text-green-400">{status.tps.overall.toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Container info */}
      {status?.container?.image && (
        <div className="bg-mc-panel border border-mc-border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Container</div>
          <div className="font-mono text-sm text-white">{status.container.name}</div>
          <div className="font-mono text-xs text-gray-500 mt-1">{status.container.image}</div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-mc-panel border border-mc-border rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Server Controls</div>
        <div className="flex flex-wrap gap-3">
          <ControlBtn
            label={busy === 'start' ? 'Starting...' : 'Start'}
            variant="green"
            disabled={running || busy !== null}
            onClick={() => handle('start', api.start)}
          />
          <ControlBtn
            label={busy === 'stop' ? 'Stopping...' : 'Stop'}
            variant="red"
            disabled={!running || busy !== null}
            onClick={() => handle('stop', api.stop)}
          />
          <ControlBtn
            label={busy === 'restart' ? 'Restarting...' : 'Restart'}
            variant="yellow"
            disabled={!running || busy !== null}
            onClick={() => handle('restart', api.restart)}
          />
        </div>
      </div>

      {/* Online players quick view */}
      {status?.players?.players?.length > 0 && (
        <div className="bg-mc-panel border border-mc-border rounded-lg p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Online Players</div>
          <div className="flex flex-wrap gap-2">
            {status.players.players.map((p) => (
              <span
                key={p.name}
                className="flex items-center gap-2 bg-mc-border px-3 py-1 rounded-full text-sm font-mono"
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
