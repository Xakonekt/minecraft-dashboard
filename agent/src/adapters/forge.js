import { BaseAdapter } from './base.js';

/**
 * ForgeAdapter — compatible with Forge and NeoForge.
 * Adds TPS support via `forge tps` command.
 */
export class ForgeAdapter extends BaseAdapter {
  constructor() {
    super('forge');
  }

  /**
   * Parse `forge tps` output.
   * Example line: "Dim 0 (minecraft:overworld): Mean tick time: 50.0 ms. Mean TPS: 20.0"
   */
  parseTPS(response) {
    const matches = [...response.matchAll(/Mean TPS:\s*(\d+\.?\d*)/g)];
    if (matches.length === 0) return null;

    const values = matches.map(m => parseFloat(m[1]));
    const overall = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      overall: parseFloat(overall.toFixed(2)),
      dimensions: values,
    };
  }

  getCapabilities() {
    return {
      rcon: true,
      tps: true,
      tpsCommand: 'forge tps',
      playerList: true,
    };
  }
}
