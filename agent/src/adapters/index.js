import { VanillaAdapter } from './vanilla.js';
import { ForgeAdapter } from './forge.js';
import { PaperAdapter } from './paper.js';

const ADAPTERS = {
  vanilla:  VanillaAdapter,
  forge:    ForgeAdapter,
  neoforge: ForgeAdapter,
  paper:    PaperAdapter,
  spigot:   PaperAdapter,
  purpur:   PaperAdapter,
  fabric:   VanillaAdapter,
};

export function getAdapter(serverType) {
  const AdapterClass = ADAPTERS[serverType?.toLowerCase()] ?? VanillaAdapter;
  return new AdapterClass();
}
