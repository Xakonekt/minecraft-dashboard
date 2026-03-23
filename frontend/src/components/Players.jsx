import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

const ACTIONS = ['kick', 'ban', 'op', 'deop'];

function ActionModal({ player, onConfirm, onCancel }) {
  const [type, setType] = useState('kick');
  const [reason, setReason] = useState('');

  const needsReason = type === 'kick' || type === 'ban';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-mc-panel border border-mc-border rounded-lg p-6 w-80 space-y-4">
        <h3 className="font-bold text-lg">
          Action on <span className="text-mc-green font-mono">{player}</span>
        </h3>

        <div className="flex gap-2 flex-wrap">
          {ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => setType(a)}
              className={`px-3 py-1 rounded text-sm font-medium capitalize transition-colors ${
                type === a
                  ? 'bg-mc-accent text-white'
                  : 'bg-mc-border text-gray-300 hover:bg-mc-border/70'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {needsReason && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Reason for ${type}...`}
              className="w-full bg-mc-darker border border-mc-border rounded px-3 py-2 text-sm
                outline-none focus:border-mc-green text-white placeholder-gray-600"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && onConfirm(type, reason)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(type, reason)}
            className="px-4 py-2 bg-mc-accent hover:bg-red-600 rounded text-sm font-medium transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export function Players() {
  const [players, setPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // player name

  const refresh = useCallback(async () => {
    try {
      const data = await api.getPlayers();
      setPlayers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleConfirm = async (type, reason) => {
    try {
      if (type === 'kick') await api.kickPlayer(selected, reason);
      else if (type === 'ban') await api.banPlayer(selected, reason);
      else if (type === 'op') await api.opPlayer(selected);
      else if (type === 'deop') await api.deopPlayer(selected);
      setSelected(null);
      await refresh();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Players</h2>
        <div className="flex items-center gap-3">
          {players && (
            <span className="text-sm text-gray-400">
              {players.online} / {players.max} online
            </span>
          )}
          <button
            onClick={refresh}
            className="px-3 py-1 text-sm bg-mc-border hover:bg-mc-border/70 rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div className="text-gray-400">Loading...</div>}
      {error && <div className="text-red-400 text-sm">Error: {error}</div>}

      {players && (
        <div className="bg-mc-panel border border-mc-border rounded-lg overflow-hidden">
          {players.players.length === 0 ? (
            <div className="py-16 text-center text-gray-500">No players online</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-mc-border">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Player
                  </th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.players.map((p, i) => (
                  <tr
                    key={p.name}
                    className={
                      i < players.players.length - 1
                        ? 'border-b border-mc-border/40'
                        : ''
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${p.name}/32`}
                          alt={p.name}
                          className="w-8 h-8 rounded"
                          onError={(e) => (e.target.style.display = 'none')}
                        />
                        <span className="font-mono font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelected(p.name)}
                        className="px-3 py-1.5 bg-mc-border hover:bg-mc-border/70 rounded text-xs
                          font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selected && (
        <ActionModal
          player={selected}
          onConfirm={handleConfirm}
          onCancel={() => setSelected(null)}
        />
      )}
    </div>
  );
}
