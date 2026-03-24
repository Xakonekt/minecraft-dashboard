import { Router } from 'express';
import { getContainerStatus, startContainer, stopContainer, restartContainer } from '../services/docker.js';
import { sendCommand, isRconAvailable } from '../services/rcon.js';
import { getAdapter } from '../adapters/index.js';
import { markIntentionalStop, handleRestartComplete, scheduleImmediatePoll } from '../services/monitor.js';

const router = Router();

router.get('/status', async (req, res) => {
  try {
    const [container, rcon] = await Promise.all([
      getContainerStatus(),
      isRconAvailable().catch(() => false),
    ]);

    let players = null;
    let tps = null;

    if (rcon && container.running) {
      const adapter = getAdapter();
      const caps = adapter.getCapabilities();

      try {
        const listResponse = await sendCommand('list');
        players = adapter.parsePlayerList(listResponse);
      } catch {}

      if (caps.tps && caps.tpsCommand) {
        try {
          const tpsResponse = await sendCommand(caps.tpsCommand);
          tps = adapter.parseTPS(tpsResponse);
        } catch {}
      }
    }

    res.json({
      container,
      rcon,
      players,
      tps,
      serverType: getAdapter().type,
      capabilities: getAdapter().getCapabilities(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/start', async (req, res) => {
  try {
    await startContainer();
    scheduleImmediatePoll(); // notify online without waiting 30s
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stop', async (req, res) => {
  try {
    markIntentionalStop();
    await stopContainer();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/restart', async (req, res) => {
  try {
    markIntentionalStop();
    await restartContainer();
    const status = await getContainerStatus();
    handleRestartComplete(status.name).catch(() => {}); // offline + online webhooks
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
