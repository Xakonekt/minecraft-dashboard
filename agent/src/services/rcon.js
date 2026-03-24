import { Rcon } from 'rcon-client';

export function createRconService(serverConfig) {
  let client = null;
  let connectPromise = null;

  async function getClient() {
    if (client?.authenticated) return client;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
      const rcon = new Rcon({
        host:     serverConfig.rconHost,
        port:     serverConfig.rconPort,
        password: serverConfig.rconPassword,
        timeout:  serverConfig.rconTimeout || 5000,
      });
      await rcon.connect();
      rcon.on('end',   () => { client = null; connectPromise = null; });
      rcon.on('error', () => { client = null; connectPromise = null; });
      client = rcon;
      connectPromise = null;
      return rcon;
    })();

    return connectPromise;
  }

  return {
    async sendCommand(command) {
      const rcon = await getClient();
      return await rcon.send(command);
    },
    async isRconAvailable() {
      try {
        await getClient();
        return true;
      } catch {
        client = null;
        connectPromise = null;
        return false;
      }
    },
  };
}
