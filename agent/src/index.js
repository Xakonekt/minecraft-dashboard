import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { setupWebSocket } from './ws/index.js';
import { startMonitor } from './services/monitor.js';
import serverRoutes from './routes/server.js';
import consoleRoutes from './routes/console.js';
import playerRoutes from './routes/players.js';

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/server', serverRoutes);
app.use('/api/console', consoleRoutes);
app.use('/api/players', playerRoutes);

app.get('/health', (_, res) => res.json({ ok: true, serverType: config.serverType }));

// WebSocket — real-time logs
setupWebSocket(server);

startMonitor();

server.listen(config.port, () => {
  console.log(`[Agent] Running on port ${config.port}`);
  console.log(`[Agent] Server type : ${config.serverType}`);
  console.log(`[Agent] Container   : ${config.docker.containerName}`);
  console.log(`[Agent] RCON        : ${config.rcon.host}:${config.rcon.port}`);
});
