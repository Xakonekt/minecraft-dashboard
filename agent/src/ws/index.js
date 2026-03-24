import { WebSocketServer } from 'ws';
import { getServer } from '../services/serverRegistry.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    // On n'accepte que les connexions vers /ws/logs/:id
    if (!req.url.match(/^\/ws\/logs\/[^/?]+/)) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    const match = req.url.match(/^\/ws\/logs\/([^/?]+)/);
    const serverId = match[1];
    const srv = getServer(serverId);

    if (!srv) {
      ws.close(1008, 'Server not found');
      return;
    }

    const { logBuffer } = srv;
    const send = (payload) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
    };

    const history = logBuffer.getLogs();
    if (history.length > 0) send({ type: 'history', data: history });

    const unsubscribe = logBuffer.subscribe((entry) => {
      send({ type: 'log', data: entry.text, timestamp: entry.timestamp });
    });

    ws.on('close', () => unsubscribe());
    ws.on('error', () => unsubscribe());
  });
}
