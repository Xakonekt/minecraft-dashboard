/**
 * BaseAdapter — defines the interface for all server type adapters.
 * Extend this class to support new server types and override only what differs.
 */
export class BaseAdapter {
  constructor(type) {
    this.type = type;
  }

  /**
   * Parse the response from the `list` RCON command.
   * Standard vanilla format:
   *   "There are X of a max of Y players online: p1, p2"
   */
  parsePlayerList(response) {
    const match = response.match(/There are (\d+) of a max of (\d+) players online:(.*)/i);
    if (!match) return { online: 0, max: 0, players: [] };

    const playerNames = match[3].trim()
      ? match[3].trim().split(', ').map(name => ({ name: name.trim() }))
      : [];

    return {
      online: parseInt(match[1]),
      max: parseInt(match[2]),
      players: playerNames,
    };
  }

  /**
   * Parse the response from a TPS command.
   * Returns null if TPS is not supported by this adapter.
   */
  parseTPS(_response) {
    return null;
  }

  /**
   * Returns the capabilities of this server type.
   * Used by routes to decide which commands to attempt.
   */
  getCapabilities() {
    return {
      rcon: true,
      tps: false,
      tpsCommand: null,
      playerList: true,
    };
  }
}
