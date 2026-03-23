import { config } from '../config.js';

const COLORS = {
  online:  0x5da831, // vert
  offline: 0xe94560, // rouge
  crash:   0xff6b35, // orange
  join:    0x5865f2, // bleu Discord
  leave:   0x99aab5, // gris
};

const TITLES = {
  online:  '✅ Serveur en ligne',
  offline: '🔴 Serveur hors ligne',
  crash:   '💥 Serveur crash',
  join:    '👤 Joueur connecté',
  leave:   '👋 Joueur déconnecté',
};

export async function sendWebhook(event, data = {}) {
  const url = config.discord.webhookUrl;
  if (!url) return;

  const embed = buildEmbed(event, data);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) console.error('[Discord] Webhook error:', res.status, await res.text());
  } catch (err) {
    console.error('[Discord] Failed to send webhook:', err.message);
  }
}

function buildEmbed(event, data) {
  const serverName = data.name || config.docker.containerName;
  const timestamp = new Date().toISOString();

  const base = {
    color: COLORS[event] ?? 0x99aab5,
    title: TITLES[event] ?? event,
    timestamp,
    footer: { text: 'Minecraft Dashboard' },
  };

  switch (event) {
    case 'online':
      return { ...base, description: `Le serveur **${serverName}** est maintenant en ligne.` };

    case 'offline':
      return { ...base, description: `Le serveur **${serverName}** s'est arrêté normalement.` };

    case 'crash':
      return {
        ...base,
        description: `Le serveur **${serverName}** s'est arrêté de façon inattendue.`,
        fields: [{ name: 'Action recommandée', value: 'Vérifier les logs pour identifier la cause.' }],
      };

    case 'join':
      return {
        ...base,
        description: `**${data.player}** a rejoint le serveur.`,
        thumbnail: { url: `https://mc-heads.net/avatar/${data.player}/64` },
      };

    case 'leave':
      return {
        ...base,
        description: `**${data.player}** a quitté le serveur.`,
        thumbnail: { url: `https://mc-heads.net/avatar/${data.player}/64` },
      };

    default:
      return { ...base, description: data.message ?? '' };
  }
}
