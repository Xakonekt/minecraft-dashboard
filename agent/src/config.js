import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  docker: {
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    containerName: process.env.CONTAINER_NAME || 'minecraft',
  },
  rcon: {
    host: process.env.RCON_HOST || 'localhost',
    port: parseInt(process.env.RCON_PORT || '25575'),
    password: process.env.RCON_PASSWORD || '',
    timeout: parseInt(process.env.RCON_TIMEOUT || '5000'),
  },
  serverType: process.env.SERVER_TYPE || 'vanilla',
  discord: {
    webhookUrl:    process.env.DISCORD_WEBHOOK_URL || '',
    notifyPlayers: process.env.DISCORD_NOTIFY_PLAYERS !== 'false',
  },
};
