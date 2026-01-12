import { LootRarity } from '../types';

export interface LootTableEntry {
  id: string;
  name: string;
  type: string; // 'weapon' | 'apparel' | 'potion' | 'misc' | 'gold'
  description?: string;
  weight?: number; // relative weight for sampling
  minQty?: number;
  maxQty?: number;
  rarity?: LootRarity;
  baseChance?: number; // optional explicit chance (0-100)
}

// Baseline loot tables by enemy type. These are conservative and are scaled by enemy.level and isBoss.
export const LOOT_TABLES: Record<string, LootTableEntry[]> = {
  humanoid: [
    { id: 'hum_gold_small', name: 'Copper Coins', type: 'misc', description: 'Small pouch of coins.', weight: 30, minQty: 5, maxQty: 25, rarity: 'common' },
    { id: 'hum_health_potion', name: 'Minor Health Potion', type: 'potion', description: 'Restores a little health.', weight: 8, minQty: 1, maxQty: 1, rarity: 'common' },
    { id: 'hum_leather', name: 'Leather Scraps', type: 'misc', weight: 15, minQty: 1, maxQty: 3, rarity: 'common' },
    { id: 'hum_ring', name: 'Silver Ring', type: 'misc', weight: 4, minQty: 1, maxQty: 1, rarity: 'uncommon' },
    { id: 'hum_iron_dagger', name: 'Iron Dagger', type: 'weapon', weight: 3, minQty: 1, maxQty: 1, rarity: 'uncommon' },
    { id: 'hum_gold_large', name: 'Small Coin Purse', type: 'misc', weight: 6, minQty: 15, maxQty: 60, rarity: 'uncommon' },
    { id: 'hum_rare_trinket', name: 'Ornate Trinket', type: 'misc', weight: 1, minQty: 1, maxQty: 1, rarity: 'rare' }
  ],
  beast: [
    { id: 'beast_meat', name: 'Raw Meat', type: 'misc', weight: 40, minQty: 1, maxQty: 3, rarity: 'common' },
    { id: 'beast_hide', name: 'Animal Hide', type: 'misc', weight: 25, minQty: 1, maxQty: 2, rarity: 'common' },
    { id: 'beast_trophy', name: 'Monster Fang', type: 'misc', weight: 10, minQty: 1, maxQty: 1, rarity: 'uncommon' },
    { id: 'beast_gem', name: 'Dull Gem', type: 'misc', weight: 2, minQty: 1, maxQty: 1, rarity: 'rare' }
  ],
  undead: [
    { id: 'und_bones', name: 'Bone Fragments', type: 'misc', weight: 40, minQty: 1, maxQty: 3, rarity: 'common' },
    { id: 'und_essence', name: 'Ectoplasm', type: 'misc', weight: 20, minQty: 1, maxQty: 2, rarity: 'uncommon' },
    { id: 'und_curse_scroll', name: 'Scroll of Minor Hex', type: 'misc', weight: 3, minQty: 1, maxQty: 1, rarity: 'rare' }
  ],
  daedra: [
    { id: 'dae_essence', name: 'Daedric Soul Fragment', type: 'misc', weight: 20, minQty: 1, maxQty: 1, rarity: 'uncommon' },
    { id: 'dae_uncommon', name: 'Imbued Shard', type: 'misc', weight: 10, minQty: 1, maxQty: 2, rarity: 'rare' },
    { id: 'dae_rare', name: 'Daedric Relic', type: 'misc', weight: 2, minQty: 1, maxQty: 1, rarity: 'legendary' }
  ],
  dragon: [
    { id: 'drg_scale', name: 'Dragon Scale', type: 'misc', weight: 30, minQty: 1, maxQty: 3, rarity: 'rare' },
    { id: 'drg_bone', name: 'Dragon Bone', type: 'misc', weight: 10, minQty: 1, maxQty: 2, rarity: 'rare' },
    { id: 'drg_gold', name: 'Pouch of Gold', type: 'misc', weight: 20, minQty: 50, maxQty: 200, rarity: 'uncommon' }
  ],
  automaton: [
    { id: 'aut_gear', name: 'Mechanical Gear', type: 'misc', weight: 30, minQty: 1, maxQty: 4, rarity: 'common' },
    { id: 'aut_metal', name: 'Refined Metal', type: 'misc', weight: 20, minQty: 1, maxQty: 3, rarity: 'uncommon' },
    { id: 'aut_core', name: 'Power Core', type: 'misc', weight: 3, minQty: 1, maxQty: 1, rarity: 'rare' }
  ]
};

export default LOOT_TABLES;
