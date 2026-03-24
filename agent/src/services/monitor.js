import { getContainerStatus, streamContainerLogs } from './docker.js';
import { sendWebhook } from './discord.js';
import { addLog, clearLogs } from './logBuffer.js';
import { config } from '../config.js';

// true = running, false = stopped, null = unknown (first check)
let lastRunning = null;
let intentionalStop = false; // set to true when WE trigger a stop/restart

const PATTERNS = {
  join:  /^.+?:\s+(.+?) joined the game$/,
  leave: /^.+?:\s+(.+?) left the game$/,
};

export async function startMonitor() {
  if (!config.discord.webhookUrl) {
    console.log('[Monitor] No Discord webhook URL configured — skipping.');
    return;
  }

  console.log('[Monitor] Started. Events: server status + players');

  // Initial status (silent — don't send webhook on startup)
  try {
    const s = await getContainerStatus();
    lastRunning = s.running;
  } catch {}

  setInterval(pollStatus, 30_000);
  startLogStream();
}

// Called from routes before stopping/restarting so we don't flag it as a crash
export function markIntentionalStop() {
  intentionalStop = true;
  setTimeout(() => { intentionalStop = false; }, 60_000);
}

async function pollStatus() {
  try {
    const { running, name } = await getContainerStatus();

    if (lastRunning !== null && lastRunning !== running) {
      if (running) {
        await sendWebhook('online', { name });
      } else {
        clearLogs(); // vider le buffer quand le serveur s'arrête
        await sendWebhook(intentionalStop ? 'offline' : 'crash', { name });
      }
      intentionalStop = false;
    }

    lastRunning = running;
  } catch (err) {
    console.error('[Monitor] Poll error:', err.message);
  }
}

async function startLogStream() {
  try {
    const stream = await streamContainerLogs(handleLog);
    stream.on('error', () => setTimeout(startLogStream, 10_000));
    stream.on('end',   () => setTimeout(startLogStream, 10_000));
  } catch {
    setTimeout(startLogStream, 10_000);
  }
}

function handleLog(line) {
  addLog(line); // toujours ajouter au buffer

  if (!config.discord.notifyPlayers) return;

  const join = line.match(PATTERNS.join);
  if (join) {
    sendWebhook('join', { player: join[1] }).catch(() => {});
    return;
  }

  const leave = line.match(PATTERNS.leave);
  if (leave) {
    sendWebhook('leave', { player: leave[1] }).catch(() => {});
  }
}
