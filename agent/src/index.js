import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { setupWebSocket } from './ws/index.js';
import { loadServers, startAllMonitors, getAllServers } from './services/serverRegistry.js';
import serversRoutes from './routes/servers.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Charger les serveurs depuis servers.json
loadServers();

// Routes
app.use('/api/servers', serversRoutes);

// Rétrocompatibilité CI/CD : total joueurs sur tous les serveurs
app.get('/api/players', async (req, res) => {
  let totalOnline = 0;
  for (const { rcon, adapter } of getAllServers()) {
    try {
      const response = await rcon.sendCommand('list');
      const players = adapter.parsePlayerList(response);
      totalOnline += players.online;
    } catch {}
  }
  res.json({ online: totalOnline });
});

app.get('/health', (_, res) => {
  const servers = getAllServers().map(({ config: c }) => ({ id: c.id, name: c.name }));
  res.json({ ok: true, servers });
});

// WebSocket — logs en temps réel par serveur
setupWebSocket(server);

// Démarrer les monitors
startAllMonitors();

server.listen(config.port, () => {
  console.log(`[Agent] Running on port ${config.port}`);
});
