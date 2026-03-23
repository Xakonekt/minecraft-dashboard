import { VanillaAdapter } from './vanilla.js';
import { ForgeAdapter } from './forge.js';
import { PaperAdapter } from './paper.js';
import { config } from '../config.js';

const ADAPTERS = {
  vanilla: VanillaAdapter,
  forge: ForgeAdapter,
  neoforge: ForgeAdapter,  // NeoForge uses same RCON format as Forge
  paper: PaperAdapter,
  spigot: PaperAdapter,
  purpur: PaperAdapter,
  fabric: VanillaAdapter,  // Fabric uses vanilla RCON
};

let instance = null;

export function getAdapter() {
  if (!instance) {
    const AdapterClass = ADAPTERS[config.serverType?.toLowerCase()] ?? VanillaAdapter;
    instance = new AdapterClass();
    console.log(`[Adapter] Using adapter: ${instance.type} (SERVER_TYPE=${config.serverType})`);
  }
  return instance;
}
