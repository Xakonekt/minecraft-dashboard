import { Router } from 'express';
import { sendCommand } from '../services/rcon.js';
import { getContainerLogs } from '../services/docker.js';

const router = Router();

router.post('/command', async (req, res) => {
  const { command } = req.body;
  if (!command?.trim()) {
    return res.status(400).json({ error: 'command is required' });
  }

  try {
    const response = await sendCommand(command.trim());
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  const tail = Math.min(parseInt(req.query.tail || '200'), 1000);
  try {
    const logs = await getContainerLogs(tail);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
