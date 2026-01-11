import { CombatState, InventoryItem, CombatEnemy } from '../types';

// Compute XP for a single enemy (kept intentionally low)
export const computeEnemyXP = (enemy: CombatEnemy) => {
  const base = Math.max(1, Math.floor((enemy.level || 1) * 3));
  return enemy.isBoss ? base * 2 : base;
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
