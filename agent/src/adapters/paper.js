import { BaseAdapter } from './base.js';

/**
 * PaperAdapter — compatible with Paper, Spigot, Purpur.
 * Adds TPS support via `tps` command.
 */
export class PaperAdapter extends BaseAdapter {
  constructor() {
    super('paper');
  }

  /**
   * Parse Paper `tps` output.
   * Example: "TPS from last 1m, 5m, 15m: *20.0, *20.0, *20.0"
   * Strips color codes and asterisks.
   */
  parseTPS(response) {
    const clean = response.replace(/\*/g, '').replace(/§./g, '');
    const match = clean.match(/(\d+\.?\d*),\s*(\d+\.?\d*),\s*(\d+\.?\d*)/);
    if (!match) return null;

    return {
      '1m': parseFloat(match[1]),
      '5m': parseFloat(match[2]),
      '15m': parseFloat(match[3]),
    };
  }

  getCapabilities() {
    return {
      rcon: true,
      tps: true,
      tpsCommand: 'tps',
      playerList: true,
    };
  }
}
