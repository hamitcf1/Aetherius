import { CombatState, InventoryItem, CombatEnemy } from '../types';

// Compute XP for a single enemy (kept intentionally low)
export const computeEnemyXP = (enemy: CombatEnemy) => {
  const base = Math.max(1, Math.floor((enemy.level || 1) * 3));
  return enemy.isBoss ? base * 2 : base;
};

// Generate loot for an enemy based on its loot table
export const generateEnemyLoot = (enemy: CombatEnemy): Array<{ name: string; type: string; description?: string; quantity: number }> => {
  if (!enemy.loot || enemy.loot.length === 0) return [];

  return enemy.loot
    .filter(item => Math.random() * 100 < item.dropChance) // Filter by drop chance
    .map(item => ({
      name: item.name,
      type: item.type,
      description: item.description,
      quantity: item.quantity,
    }));
};

// Populate pending loot for all defeated enemies
export const populatePendingLoot = (state: CombatState): CombatState => {
  const newState = { ...state };
  newState.pendingLoot = newState.enemies
    .filter(enemy => enemy.currentHealth <= 0) // Only defeated enemies
    .map(enemy => ({
      enemyId: enemy.id,
      enemyName: enemy.name,
      loot: generateEnemyLoot(enemy),
    }));

  return newState;
};

// Finalize loot: apply selected items to player's inventory atomically and mark rewards
// selectedItems: Array of { name, quantity }
export const finalizeLoot = (
  state: CombatState,
  selectedItems: Array<{ name: string; quantity: number }> | null,
  currentInventory: InventoryItem[]
): { newState: CombatState; updatedInventory: InventoryItem[]; grantedXp: number; grantedGold: number; grantedItems: Array<{ name: string; type: string; description?: string; quantity: number }> } => {
  let newState = { ...state };
  const grantedItems: Array<{ name: string; type: string; description?: string; quantity: number }> = [];
  let updatedInventory = [...currentInventory];

  if (!newState.pendingRewards) newState.pendingRewards = { xp: 0, gold: 0, items: [] };

  // If selectedItems is null => player skipped looting
  const selections = selectedItems || [];

  // Apply selections atomically
  selections.forEach(sel => {
    // Try to find a matching pendingLoot entry to determine type/description
    let meta: any = undefined;
    (newState.pendingLoot || []).forEach(pl => {
      const found = pl.loot.find(l => l.name === sel.name);
      if (found) meta = found;
    });

    const qty = sel.quantity || 1;
    grantedItems.push({ name: sel.name, type: meta?.type || 'misc', description: meta?.description, quantity: qty });

    // Add to inventory (merge by name)
    const idx = updatedInventory.findIndex(it => it.name === sel.name);
    if (idx === -1) {
      updatedInventory.push({
        id: `loot_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        characterId: '',
        name: sel.name,
        type: meta?.type || 'misc',
        description: meta?.description || '',
        quantity: qty,
        equipped: false
      } as InventoryItem);
    } else {
      const copy = { ...updatedInventory[idx], quantity: (updatedInventory[idx].quantity || 0) + qty };
      updatedInventory[idx] = copy;
    }
  });

  // Grant XP and gold from pendingRewards (but scale conservatively)
  const grantedXp = Math.max(0, newState.pendingRewards?.xp || 0);
  const grantedGold = Math.max(0, newState.pendingRewards?.gold || 0);

  // Mark rewards applied
  newState.rewards = { xp: grantedXp, gold: grantedGold, items: grantedItems };
  newState.result = 'victory';
  newState.lootPending = false;
  newState.pendingLoot = [];
  newState.pendingRewards = undefined;

  return { newState, updatedInventory, grantedXp, grantedGold, grantedItems };
};
