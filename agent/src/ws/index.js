import { WebSocketServer } from 'ws';
import { getLogs, subscribe } from '../services/logBuffer.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/logs' });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WS] Client connected: ${clientIp}`);

    const send = (payload) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    // Envoyer l'historique dès la connexion
    const history = getLogs();
    if (history.length > 0) {
      send({ type: 'history', data: history });
    }

    // S'abonner aux nouveaux logs
    const unsubscribe = subscribe((entry) => {
      send({ type: 'log', data: entry.text, timestamp: entry.timestamp });
    });

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${clientIp}`);
      unsubscribe();
    });

    ws.on('error', () => {
      unsubscribe();
    });
  });

  return wss;
}
