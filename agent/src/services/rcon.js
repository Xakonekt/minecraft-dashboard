import { Rcon } from 'rcon-client';
import { config } from '../config.js';

let client = null;
let connectPromise = null;

async function getClient() {
  if (client?.authenticated) return client;

  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const rcon = new Rcon({
      host: config.rcon.host,
      port: config.rcon.port,
      password: config.rcon.password,
      timeout: config.rcon.timeout,
    });

    await rcon.connect();

    rcon.on('end', () => { client = null; connectPromise = null; });
    rcon.on('error', () => { client = null; connectPromise = null; });

    client = rcon;
    connectPromise = null;
    return rcon;
  })();

  return connectPromise;
}

export async function sendCommand(command) {
  const rcon = await getClient();
  return await rcon.send(command);
}

export async function isRconAvailable() {
  try {
    await getClient();
    return true;
  } catch {
    client = null;
    connectPromise = null;
    return false;
  }
}
