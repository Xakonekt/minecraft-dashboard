import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  docker: {
    socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
  },
  discord: {
    webhookUrl:    process.env.DISCORD_WEBHOOK_URL || '',
    notifyPlayers: process.env.DISCORD_NOTIFY_PLAYERS !== 'false',
  },
};
