import { WebSocketServer } from 'ws';
import { getServer } from '../services/serverRegistry.js';

export function setupWebSocket(server) {
  // Pas de path strict — on filtre manuellement pour gérer /ws/logs/:id
  const wss = new WebSocketServer({ server, noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const match = req.url.match(/^\/ws\/logs\/([^/?]+)/);
    if (!match) {
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

    // Envoyer l'historique dès la connexion
    const history = logBuffer.getLogs();
    if (history.length > 0) send({ type: 'history', data: history });

    // S'abonner aux nouveaux logs
    const unsubscribe = logBuffer.subscribe((entry) => {
      send({ type: 'log', data: entry.text, timestamp: entry.timestamp });
    });

    ws.on('close', () => unsubscribe());
    ws.on('error', () => unsubscribe());
  });
}
