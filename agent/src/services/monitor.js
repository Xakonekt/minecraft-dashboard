import { sendWebhook } from './discord.js';
import { config } from '../config.js';

const PATTERNS = {
  join:  /^.+?:\s+(.+?) joined the game$/,
  leave: /^.+?:\s+(.+?) left the game$/,
};

export function createMonitor(serverConfig, logBuffer, dockerService) {
  let lastRunning = null;
  let intentionalStop = false;

  async function pollStatus() {
    try {
      const { running, name } = await dockerService.getContainerStatus();

      if (lastRunning !== null && lastRunning !== running) {
        if (running) {
          await sendWebhook('online', { name });
        } else {
          logBuffer.clearLogs();
          await sendWebhook(intentionalStop ? 'offline' : 'crash', { name });
        }
        intentionalStop = false;
      }

      lastRunning = running;
    } catch (err) {
      console.error(`[Monitor:${serverConfig.id}] Poll error:`, err.message);
    }
  }

  async function startLogStream() {
    try {
      const stream = await dockerService.streamContainerLogs(handleLog);
      stream.on('error', () => setTimeout(startLogStream, 10_000));
      stream.on('end',   () => setTimeout(startLogStream, 10_000));
    } catch {
      setTimeout(startLogStream, 10_000);
    }
  }

  function handleLog(line) {
    logBuffer.addLog(line);

    if (!config.discord.notifyPlayers) return;

    const join = line.match(PATTERNS.join);
    if (join) { sendWebhook('join', { player: join[1] }).catch(() => {}); return; }

    const leave = line.match(PATTERNS.leave);
    if (leave) { sendWebhook('leave', { player: leave[1] }).catch(() => {}); }
  }

  return {
    async start() {
      if (!config.discord.webhookUrl) {
        console.log(`[Monitor:${serverConfig.id}] No webhook URL — Discord disabled.`);
      } else {
        console.log(`[Monitor:${serverConfig.id}] Started.`);
      }
      try {
        const s = await dockerService.getContainerStatus();
        lastRunning = s.running;
      } catch {}

      setInterval(pollStatus, 30_000);
      startLogStream();
    },

    markIntentionalStop() {
      intentionalStop = true;
      setTimeout(() => { intentionalStop = false; }, 60_000);
    },

    async handleRestartComplete(name) {
      await sendWebhook('offline', { name });
      lastRunning = false;
      setTimeout(pollStatus, 1000);
    },

    scheduleImmediatePoll() {
      setTimeout(pollStatus, 2000);
    },
  };
}
