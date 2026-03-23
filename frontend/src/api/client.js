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
  // Server status & control
  getStatus: () => request('/api/server/status'),
  start: () => request('/api/server/start', { method: 'POST' }),
  stop: () => request('/api/server/stop', { method: 'POST' }),
  restart: () => request('/api/server/restart', { method: 'POST' }),

  // Console
  sendCommand: (command) =>
    request('/api/console/command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    }),
  getLogs: (tail = 200) => request(`/api/console/logs?tail=${tail}`),

  // Players
  getPlayers: () => request('/api/players'),
  kickPlayer: (name, reason) =>
    request(`/api/players/${encodeURIComponent(name)}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  banPlayer: (name, reason) =>
    request(`/api/players/${encodeURIComponent(name)}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  opPlayer: (name) =>
    request(`/api/players/${encodeURIComponent(name)}/op`, { method: 'POST' }),
  deopPlayer: (name) =>
    request(`/api/players/${encodeURIComponent(name)}/deop`, { method: 'POST' }),
};

export function createWebSocket(onMessage, onOpen, onClose) {
  const wsUrl = `${BASE_URL.replace(/^http/, 'ws')}/ws/logs`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {}
  };

  if (onOpen) ws.onopen = onOpen;
  if (onClose) ws.onclose = onClose;

  return ws;
}
