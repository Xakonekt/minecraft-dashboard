// Scheduler de redémarrage automatique quotidien
// Config dans servers.json : { "autoRestart": { "enabled": true, "time": "04:00", "skipIfPlayersOnline": true } }

export function startScheduler(serverConfig, monitor, dockerService, rconService, adapter) {
  const cfg = serverConfig.autoRestart;
  if (!cfg?.enabled) return;

  const [targetHour, targetMinute] = cfg.time.split(':').map(Number);

  function msUntilNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(targetHour, targetMinute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  }

  async function warn(message) {
    try {
      await rconService.sendCommand(`say ${message}`);
    } catch {
      // Serveur hors ligne — pas grave
    }
  }

  async function performRestart() {
    const id = serverConfig.id;

    // Vérifier les joueurs si demandé
    if (cfg.skipIfPlayersOnline) {
      try {
        const response = await rconService.sendCommand('list');
        const { online } = adapter.parsePlayerList(response);
        if (online > 0) {
          console.log(`[Scheduler:${id}] ${online} joueur(s) en ligne — redémarrage annulé`);
          scheduleNext();
          return;
        }
      } catch {
        // RCON indisponible = serveur éteint, on peut continuer
      }
    }

    console.log(`[Scheduler:${id}] Redémarrage automatique en cours...`);
    try {
      monitor.markIntentionalStop();
      await dockerService.restartContainer();
      const status = await dockerService.getContainerStatus();
      await monitor.handleRestartComplete(status.name);
      console.log(`[Scheduler:${id}] Redémarrage terminé.`);
    } catch (err) {
      console.error(`[Scheduler:${id}] Erreur lors du redémarrage :`, err.message);
    }

    scheduleNext();
  }

  function scheduleNext() {
    const delay = msUntilNext();
    const nextDate = new Date(Date.now() + delay);
    console.log(`[Scheduler:${serverConfig.id}] Prochain redémarrage : ${nextDate.toLocaleString()}`);

    // Avertissements avant le redémarrage
    const warn5min = delay - 5 * 60 * 1000;
    const warn1min = delay - 1 * 60 * 1000;

    if (warn5min > 0) {
      setTimeout(() => warn('§e[Auto] Le serveur redémarre dans 5 minutes.'), warn5min);
    }
    if (warn1min > 0) {
      setTimeout(() => warn('§c[Auto] Le serveur redémarre dans 1 minute !'), warn1min);
    }
    setTimeout(() => warn('§4[Auto] Redémarrage maintenant...').then(performRestart), delay);
  }

  scheduleNext();
}
