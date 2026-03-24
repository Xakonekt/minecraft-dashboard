const BASE_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Liste de tous les serveurs (avec état running)
  getServers: () => request('/api/servers'),

  // Status + contrôle par serveur
  getStatus:  (id) => request(`/api/servers/${id}/status`),
  start:      (id) => request(`/api/servers/${id}/start`,   { method: 'POST' }),
  stop:       (id) => request(`/api/servers/${id}/stop`,    { method: 'POST' }),
  restart:    (id) => request(`/api/servers/${id}/restart`, { method: 'POST' }),

  // Console
  sendCommand: (id, command) =>
    request(`/api/servers/${id}/console/command`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
  getLogs: (id, tail = 200) => request(`/api/servers/${id}/console/logs?tail=${tail}`),

  // Joueurs
  getPlayers: (id) => request(`/api/servers/${id}/players`),
  kickPlayer: (id, name, reason) =>
    request(`/api/servers/${id}/players/${encodeURIComponent(name)}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  banPlayer: (id, name, reason) =>
    request(`/api/servers/${id}/players/${encodeURIComponent(name)}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  opPlayer:   (id, name) =>
    request(`/api/servers/${id}/players/${encodeURIComponent(name)}/op`,   { method: 'POST' }),
  deopPlayer: (id, name) =>
    request(`/api/servers/${id}/players/${encodeURIComponent(name)}/deop`, { method: 'POST' }),
};

export function createWebSocket(serverId, onMessage, onOpen, onClose) {
  const wsUrl = `${BASE_URL.replace(/^http/, 'ws')}/ws/logs/${serverId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch {}
  };

  if (onOpen)  ws.onopen  = onOpen;
  if (onClose) ws.onclose = onClose;

  return ws;
}
