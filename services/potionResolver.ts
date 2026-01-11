import { InventoryItem } from '../types';

export type PotionStat = 'health' | 'magicka' | 'stamina';

// Centralized resolver for potion effects. Determines intended target stat and amount.
export const resolvePotionEffect = (item: InventoryItem): { stat?: PotionStat; amount?: number; reason?: string } => {
  if (!item || item.type !== 'potion') return { reason: 'not_a_potion' };

  // Explicit subtype wins if valid
  if (item.subtype === 'health' || item.subtype === 'magicka' || item.subtype === 'stamina') {
    return { stat: item.subtype as PotionStat, amount: item.damage, reason: 'explicit_subtype' };
  }

  // Infer from name with simple keyword checks. This is centralized and logged by caller.
  const name = (item.name || '').toLowerCase();
  const keywords: Record<PotionStat, string[]> = {
    health: ['health', 'heal', 'healing', 'vitality', 'hp'],
    magicka: ['magicka', 'mana', 'magick', 'spell'],
    stamina: ['stamina', 'endurance', 'energy', 'fatigue']
  };

  const matches: PotionStat[] = [];
  (Object.keys(keywords) as PotionStat[]).forEach(stat => {
    for (const kw of keywords[stat]) {
      if (name.includes(kw)) {
        matches.push(stat);
        break;
      }
    }
  });

  if (matches.length === 1) {
    return { stat: matches[0], amount: item.damage, reason: 'inferred_from_name' };
  }

  // If multiple matches or none, we cannot confidently resolve the stat.
  return { reason: matches.length > 1 ? 'ambiguous_inference' : 'no_inference' };
};

export default resolvePotionEffect;
