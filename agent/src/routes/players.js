import { Router } from 'express';
import { sendCommand } from '../services/rcon.js';
import { getAdapter } from '../adapters/index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const response = await sendCommand('list');
    const players = getAdapter().parsePlayerList(response);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/kick', async (req, res) => {
  const { name } = req.params;
  const { reason = 'Kicked by admin' } = req.body;
  try {
    const response = await sendCommand(`kick ${name} ${reason}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/ban', async (req, res) => {
  const { name } = req.params;
  const { reason = 'Banned by admin' } = req.body;
  try {
    const response = await sendCommand(`ban ${name} ${reason}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/op', async (req, res) => {
  const { name } = req.params;
  try {
    const response = await sendCommand(`op ${name}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:name/deop', async (req, res) => {
  const { name } = req.params;
  try {
    const response = await sendCommand(`deop ${name}`);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
