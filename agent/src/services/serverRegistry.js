import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createLogBuffer } from './logBuffer.js';
import { createDockerService } from './docker.js';
import { createRconService } from './rcon.js';
import { createMonitor } from './monitor.js';
import { startScheduler } from './scheduler.js';
import { getAdapter } from '../adapters/index.js';

const registry = new Map();

export function loadServers() {
  const path = resolve(process.cwd(), 'servers.json');

  if (!existsSync(path)) {
    console.error('[Registry] servers.json introuvable !');
    console.error('[Registry] Copie servers.json.example → servers.json et configure tes serveurs.');
    process.exit(1);
  }

  const configs = JSON.parse(readFileSync(path, 'utf8'));

  for (const serverConfig of configs) {
    const logBuffer    = createLogBuffer();
    const dockerService = createDockerService(serverConfig);
    const rconService  = createRconService(serverConfig);
    const monitor      = createMonitor(serverConfig, logBuffer, dockerService);
    const adapter      = getAdapter(serverConfig.serverType);

    registry.set(serverConfig.id, {
      config: serverConfig,
      logBuffer,
      docker: dockerService,
      rcon:   rconService,
      monitor,
      adapter,
    });
  }

  console.log(`[Registry] ${registry.size} serveur(s) chargé(s) : ${[...registry.keys()].join(', ')}`);
}

export function startAllMonitors() {
  for (const { config, monitor, docker, rcon, adapter } of registry.values()) {
    monitor.start();
    startScheduler(config, monitor, docker, rcon, adapter);
  }
}

export function getServer(id) {
  return registry.get(id);
}

export function getAllServers() {
  return [...registry.values()];
}
