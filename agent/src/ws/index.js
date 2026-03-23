import { WebSocketServer } from 'ws';
import { streamContainerLogs } from '../services/docker.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/logs' });

  wss.on('connection', async (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WS] Client connected: ${clientIp}`);

    let logStream = null;

    const send = (payload) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    try {
      logStream = await streamContainerLogs((line) => {
        send({ type: 'log', data: line, timestamp: new Date().toISOString() });
      });

      logStream.on('error', (err) => {
        send({ type: 'error', data: `Log stream error: ${err.message}` });
      });
    } catch (err) {
      send({ type: 'error', data: `Could not connect to container: ${err.message}` });
    }

    ws.on('close', () => {
      console.log(`[WS] Client disconnected: ${clientIp}`);
      logStream?.destroy();
    });

    ws.on('error', () => {
      logStream?.destroy();
    });
  });

  return wss;
}
