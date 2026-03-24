import { Router } from 'express';
import { getServer, getAllServers } from '../services/serverRegistry.js';

const router = Router();

// ─── Helper ────────────────────────────────────────────────────────────────

function resolve(req, res) {
  const server = getServer(req.params.id);
  if (!server) { res.status(404).json({ error: 'Server not found' }); return null; }
  return server;
}

// ─── List all servers (with live running state) ─────────────────────────────

router.get('/', async (req, res) => {
  const list = await Promise.all(
    getAllServers().map(async ({ config, docker }) => {
      try {
        const { running } = await docker.getContainerStatus();
        return { id: config.id, name: config.name, serverType: config.serverType, running };
      } catch {
        return { id: config.id, name: config.name, serverType: config.serverType, running: false };
      }
    })
  );
  res.json(list);
});

// ─── Server status ──────────────────────────────────────────────────────────

router.get('/:id/status', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;

  try {
    const [container, rconAvailable] = await Promise.all([
      server.docker.getContainerStatus(),
      server.rcon.isRconAvailable().catch(() => false),
    ]);

    let players = null;
    let tps     = null;

    if (rconAvailable && container.running) {
      const caps = server.adapter.getCapabilities();
      try {
        const listResponse = await server.rcon.sendCommand('list');
        players = server.adapter.parsePlayerList(listResponse);
      } catch {}
      if (caps.tps && caps.tpsCommand) {
        try {
          const tpsResponse = await server.rcon.sendCommand(caps.tpsCommand);
          tps = server.adapter.parseTPS(tpsResponse);
        } catch {}
      }
    }

    res.json({
      container,
      rcon: rconAvailable,
      players,
      tps,
      serverType:   server.adapter.type,
      capabilities: server.adapter.getCapabilities(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Server controls ────────────────────────────────────────────────────────

router.post('/:id/start', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    await server.docker.startContainer();
    server.monitor.scheduleImmediatePoll();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/stop', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    server.monitor.markIntentionalStop();
    await server.docker.stopContainer();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/restart', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    server.monitor.markIntentionalStop();
    await server.docker.restartContainer();
    const status = await server.docker.getContainerStatus();
    server.monitor.handleRestartComplete(status.name).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Players ────────────────────────────────────────────────────────────────

router.get('/:id/players', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    const response = await server.rcon.sendCommand('list');
    res.json(server.adapter.parsePlayerList(response));
  } catch (err) {
    res.json({ online: 0, max: 0, players: [], rconError: err.message });
  }
});

router.post('/:id/players/:name/kick', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  const { reason = 'Kicked by admin' } = req.body;
  try {
    const response = await server.rcon.sendCommand(`kick ${req.params.name} ${reason}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/:name/ban', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  const { reason = 'Banned by admin' } = req.body;
  try {
    const response = await server.rcon.sendCommand(`ban ${req.params.name} ${reason}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/:name/op', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    const response = await server.rcon.sendCommand(`op ${req.params.name}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/players/:name/deop', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  try {
    const response = await server.rcon.sendCommand(`deop ${req.params.name}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Console ────────────────────────────────────────────────────────────────

router.post('/:id/console/command', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  const { command } = req.body;
  if (!command?.trim()) return res.status(400).json({ error: 'command is required' });
  try {
    const response = await server.rcon.sendCommand(command.trim());
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/console/logs', async (req, res) => {
  const server = resolve(req, res);
  if (!server) return;
  const tail = Math.min(parseInt(req.query.tail || '200'), 1000);
  try {
    const logs = await server.docker.getContainerLogs(tail);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
