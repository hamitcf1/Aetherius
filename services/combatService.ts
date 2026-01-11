/**
 * Combat Service - Pokemon-style turn-based combat system
 * Integrates with character stats, equipment, and AI narration
 */

import { 
  Character, 
  InventoryItem, 
  CombatState, 
  CombatEnemy, 
  CombatAbility, 
  CombatEffect,
  CombatLogEntry,
  PlayerCombatStats,
  CombatActionType
} from '../types';
import { getFoodNutrition } from './nutritionData';

// ============================================================================
// DYNAMIC ENEMY NAME POOLS - For variation
// ============================================================================

const ENEMY_NAME_PREFIXES: Record<string, string[]> = {
  bandit: ['Savage', 'Ruthless', 'Desperate', 'Scarred', 'One-Eyed', 'Grizzled', 'Sneering', 'Bloodthirsty', 'Cunning', 'Vicious'],
  bandit_chief: ['Chief', 'Boss', 'Warlord', 'Captain', 'Leader', 'Scourge', 'Terror of'],
  wolf: ['Grey', 'White', 'Black', 'Timber', 'Dire', 'Frost', 'Starving', 'Alpha', 'Rabid', 'Wild'],
  skeleton: ['Ancient', 'Shambling', 'Cursed', 'Corrupted', 'Risen', 'Bound', 'Restless', 'Decrepit'],
  draugr: ['Ancient', 'Restless', 'Cursed', 'Dread', 'Wight', 'Scourge', 'Death', 'Frost-Touched'],
  frost_spider: ['Giant', 'Venomous', 'Frost', 'Albino', 'Corrupted', 'Nest Guardian', 'Broodmother'],
  troll: ['Cave', 'Frost', 'Unyielding', 'Massive', 'Rampaging', 'Savage', 'Ancient'],
  bear: ['Cave', 'Snow', 'Raging', 'Wounded', 'Massive', 'Territorial', 'Starving'],
  sabre_cat: ['Snowy', 'Vale', 'Frost', 'Prowling', 'Hunting', 'Alpha', 'Scarred'],
  vampire: ['Ancient', 'Feral', 'Blood-Starved', 'Noble', 'Thrall', 'Master', 'Corrupted'],
  mage: ['Rogue', 'Corrupt', 'Apostate', 'Flame', 'Frost', 'Storm', 'Necromancer'],
  default: ['Fierce', 'Deadly', 'Dangerous', 'Menacing', 'Threatening']
};

const ENEMY_PERSONALITY_TRAITS = [
  'battle-scarred', 'cunning', 'reckless', 'cautious', 'vengeful', 
  'hungry', 'territorial', 'desperate', 'confident', 'fearless'
];

// Randomization helper functions
const randomRange = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomVariation = (base: number, variance: number): number => 
  Math.floor(base * (1 + (Math.random() - 0.5) * 2 * variance));

const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const shuffleArray = <T>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ============================================================================
// PLAYER COMBAT STATS CALCULATION
// ============================================================================

export const calculatePlayerCombatStats = (
  character: Character,
  equipment: InventoryItem[]
): PlayerCombatStats => {
  const equippedItems = equipment.filter(item => item.equipped);
  
  // Base stats from character
  let armor = 0;
  let weaponDamage = 10; // Base unarmed damage
  let critChance = 5;
  let dodgeChance = 0;
  let magicResist = 0;

  // Calculate from equipment
  equippedItems.forEach(item => {
    if (item.armor) armor += item.armor;
    if (item.damage) weaponDamage = Math.max(weaponDamage, item.damage);
  });

  // Skill bonuses
  const getSkillLevel = (name: string) => 
    character.skills.find(s => s.name === name)?.level || 15;

  // Light/Heavy armor skill affects armor rating
  const lightArmorSkill = getSkillLevel('Light Armor');
  const heavyArmorSkill = getSkillLevel('Heavy Armor');
  const armorSkillBonus = Math.max(lightArmorSkill, heavyArmorSkill) * 0.5;
  armor = Math.floor(armor * (1 + armorSkillBonus / 100));

  // Sneak affects dodge chance
  dodgeChance = Math.floor(getSkillLevel('Sneak') * 0.3);

  // One-Handed/Two-Handed affects weapon damage
  const oneHandedSkill = getSkillLevel('One-Handed');
  const twoHandedSkill = getSkillLevel('Two-Handed');
  const archerySkill = getSkillLevel('Archery');
  const weaponSkillBonus = Math.max(oneHandedSkill, twoHandedSkill, archerySkill) * 0.5;
  weaponDamage = Math.floor(weaponDamage * (1 + weaponSkillBonus / 100));

  // Destruction affects magic damage (handled in abilities)
  // Alteration affects magic resist
  magicResist = Math.floor(getSkillLevel('Alteration') * 0.2);

  // Generate abilities based on skills and equipment
  const abilities = generatePlayerAbilities(character, equippedItems);

  return {
    maxHealth: character.stats.health,
    currentHealth: character.currentVitals?.currentHealth ?? character.stats.health,
    maxMagicka: character.stats.magicka,
    currentMagicka: character.currentVitals?.currentMagicka ?? character.stats.magicka,
    maxStamina: character.stats.stamina,
    currentStamina: character.currentVitals?.currentStamina ?? character.stats.stamina,
    armor,
    weaponDamage,
    critChance,
    dodgeChance,
    magicResist,
    abilities
  };
};

// ============================================================================
// PLAYER ABILITIES GENERATION
// ============================================================================

const generatePlayerAbilities = (
  character: Character,
  equipment: InventoryItem[]
): CombatAbility[] => {
  const abilities: CombatAbility[] = [];
  const getSkillLevel = (name: string) => 
    character.skills.find(s => s.name === name)?.level || 15;

  // Always available: Basic Attack
  const weapon = equipment.find(i => i.equipped && i.slot === 'weapon');
  abilities.push({
    id: 'basic_attack',
    name: weapon ? `Strike with ${weapon.name}` : 'Unarmed Strike',
    type: 'melee',
    damage: weapon?.damage || 10,
    cost: 10, // stamina
    description: 'A basic attack with your equipped weapon.'
  });

  // Power Attack (if stamina > 25 and weapon skill > 20)
  const weaponSkill = Math.max(getSkillLevel('One-Handed'), getSkillLevel('Two-Handed'));
  if (weaponSkill >= 20) {
    abilities.push({
      id: 'power_attack',
      name: 'Power Attack',
      type: 'melee',
      damage: Math.floor((weapon?.damage || 10) * 1.5),
      cost: 25,
      cooldown: 2,
      description: 'A powerful strike that deals 50% more damage.',
      effects: [{ type: 'stun', value: 1, duration: 1, chance: 25 }]
    });
  }

  // Shield Bash (if shield equipped)
  const shield = equipment.find(i => i.equipped && i.slot === 'offhand' && i.armor);
  if (shield) {
    abilities.push({
      id: 'shield_bash',
      name: 'Shield Bash',
      type: 'melee',
      damage: Math.floor(shield.armor! * 0.5),
      cost: 15,
      cooldown: 2,
      effects: [{ type: 'stun', value: 1, duration: 1, chance: 50 }],
      description: 'Bash with your shield, potentially stunning the enemy.'
    });
  }

  // Magic abilities based on destruction skill
  const destructionSkill = getSkillLevel('Destruction');
  if (destructionSkill >= 20) {
    abilities.push({
      id: 'flames',
      name: 'Flames',
      type: 'magic',
      damage: 15 + Math.floor(destructionSkill * 0.3),
      cost: 15,
      description: 'A stream of fire that damages enemies.',
      effects: [{ type: 'dot', stat: 'health', value: 3, duration: 2, chance: 30 }]
    });
  }
  if (destructionSkill >= 35) {
    abilities.push({
      id: 'ice_spike',
      name: 'Ice Spike',
      type: 'magic',
      damage: 25 + Math.floor(destructionSkill * 0.4),
      cost: 25,
      cooldown: 1,
      description: 'A spike of ice that slows enemies.',
      effects: [{ type: 'debuff', stat: 'stamina', value: -20, duration: 2 }]
    });
  }
  if (destructionSkill >= 50) {
    abilities.push({
      id: 'lightning_bolt',
      name: 'Lightning Bolt',
      type: 'magic',
      damage: 35 + Math.floor(destructionSkill * 0.5),
      cost: 35,
      cooldown: 2,
      description: 'A bolt of lightning that drains magicka.',
      effects: [{ type: 'drain', stat: 'magicka', value: 15 }]
    });
  }

  // Restoration spells
  const restorationSkill = getSkillLevel('Restoration');
  if (restorationSkill >= 20) {
    abilities.push({
      id: 'healing',
      name: 'Healing',
      type: 'magic',
      damage: 0,
      cost: 20,
      description: 'Restore your health.',
      effects: [{ type: 'heal', stat: 'health', value: 25 + Math.floor(restorationSkill * 0.5) }]
    });
  }

  // Conjuration - summon would be complex, so we'll do a damage spell
  const conjurationSkill = getSkillLevel('Conjuration');
  if (conjurationSkill >= 30) {
    abilities.push({
      id: 'bound_weapon',
      name: 'Bound Weapon',
      type: 'magic',
      damage: 30 + Math.floor(conjurationSkill * 0.3),
      cost: 30,
      cooldown: 3,
      description: 'Conjure a spectral weapon to strike your foe.'
    });
  }

  // Archery (if bow equipped)
  const bow = equipment.find(i => i.equipped && i.slot === 'weapon' && 
    i.name.toLowerCase().includes('bow'));
  if (bow) {
    const archerySkill = getSkillLevel('Archery');
    abilities.push({
      id: 'aimed_shot',
      name: 'Aimed Shot',
      type: 'ranged',
      damage: Math.floor((bow.damage || 15) * 1.3),
      cost: 20,
      cooldown: 1,
      description: 'A carefully aimed arrow for extra damage.',
      effects: [{ type: 'damage', value: Math.floor(archerySkill * 0.2), chance: 100 }]
    });
  }

  return abilities;
};

// ============================================================================
// COMBAT STATE MANAGEMENT
// ============================================================================

export const initializeCombat = (
  enemies: CombatEnemy[],
  location: string,
  ambush: boolean = false,
  fleeAllowed: boolean = true,
  surrenderAllowed: boolean = false
): CombatState => {
  // Initialize enemies with IDs and full health
  const initializedEnemies = enemies.map((enemy, index) => ({
    ...enemy,
    id: enemy.id || `enemy_${index}_${Date.now()}`,
    currentHealth: enemy.maxHealth,
    currentMagicka: enemy.maxMagicka,
    currentStamina: enemy.maxStamina,
    activeEffects: []
  }));

  // Calculate turn order (player first unless ambushed)
  const turnOrder = ambush 
    ? [...initializedEnemies.map(e => e.id), 'player']
    : ['player', ...initializedEnemies.map(e => e.id)];

  return {
    active: true,
    turn: 1,
    currentTurnActor: turnOrder[0],
    turnOrder,
    enemies: initializedEnemies,
    location,
    fleeAllowed,
    surrenderAllowed,
    combatLog: [{
      turn: 0,
      actor: 'system',
      action: 'combat_start',
      narrative: ambush 
        ? `You've been ambushed! ${initializedEnemies.map(e => e.name).join(', ')} attack!`
        : `Combat begins against ${initializedEnemies.map(e => e.name).join(', ')}!`,
      timestamp: Date.now()
    }],
    playerDefending: false,
    playerActiveEffects: [],
    abilityCooldowns: {}
  };
};

// ============================================================================
// DAMAGE CALCULATION
// ============================================================================

export const calculateDamage = (
  baseDamage: number,
  attackerLevel: number,
  targetArmor: number,
  targetResistances: string[] = [],
  damageType?: string,
  critChance: number = 0
): { damage: number; isCrit: boolean; resisted: boolean } => {
  // Check for resistance
  const resisted = damageType ? targetResistances.includes(damageType) : false;
  
  // Base damage with level scaling
  let damage = baseDamage + Math.floor(attackerLevel * 0.5);
  
  // Armor reduction (diminishing returns)
  const armorReduction = targetArmor / (targetArmor + 100);
  damage = Math.floor(damage * (1 - armorReduction));
  
  // Resistance halves damage
  if (resisted) {
    damage = Math.floor(damage * 0.5);
  }
  
  // Crit check
  const isCrit = Math.random() * 100 < critChance;
  if (isCrit) {
    damage = Math.floor(damage * 1.5);
  }
  
  // Minimum damage
  damage = Math.max(1, damage);
  
  return { damage, isCrit, resisted };
};

// ============================================================================
// PLAYER ACTIONS
// ============================================================================

export const executePlayerAction = (
  state: CombatState,
  playerStats: PlayerCombatStats,
  action: CombatActionType,
  targetId?: string,
  abilityId?: string,
  itemId?: string,
  inventory?: InventoryItem[]
): { newState: CombatState; newPlayerStats: PlayerCombatStats; narrative: string; usedItem?: InventoryItem } => {
  let newState = { ...state };
  let newPlayerStats = { ...playerStats };
  let narrative = '';

  switch (action) {
    case 'attack':
    case 'power_attack':
    case 'magic':
    case 'shout': {
      const ability = abilityId 
        ? playerStats.abilities.find(a => a.id === abilityId)
        : playerStats.abilities[0]; // Default to basic attack
      
      if (!ability) {
        narrative = 'Invalid ability!';
        break;
      }

      // Check cooldown
      if (newState.abilityCooldowns[ability.id] > 0) {
        narrative = `${ability.name} is still on cooldown for ${newState.abilityCooldowns[ability.id]} turns!`;
        break;
      }

      // Check cost
      const costType = ability.type === 'magic' ? 'currentMagicka' : 'currentStamina';
      if (newPlayerStats[costType] < ability.cost) {
        narrative = `Not enough ${ability.type === 'magic' ? 'magicka' : 'stamina'} for ${ability.name}!`;
        break;
      }

      // Pay cost
      newPlayerStats[costType] -= ability.cost;

      // Find target
      const target = targetId 
        ? newState.enemies.find(e => e.id === targetId)
        : newState.enemies.find(e => e.currentHealth > 0);
      
      if (!target) {
        narrative = 'No valid target!';
        break;
      }

      // Calculate damage
      const { damage, isCrit, resisted } = calculateDamage(
        ability.damage + playerStats.weaponDamage * (ability.type === 'melee' ? 0.5 : 0),
        12, // Player level - should come from character
        target.armor,
        target.resistances,
        ability.type === 'magic' ? 'magic' : undefined,
        playerStats.critChance
      );

      // Apply damage
      const enemyIndex = newState.enemies.findIndex(e => e.id === target.id);
      newState.enemies[enemyIndex] = {
        ...target,
        currentHealth: Math.max(0, target.currentHealth - damage)
      };

      // Set cooldown
      if (ability.cooldown) {
        newState.abilityCooldowns[ability.id] = ability.cooldown;
      }

      // Build narrative
      let damageNarrative = `deals ${damage} damage`;
      if (isCrit) damageNarrative = `CRITICAL HIT! ` + damageNarrative;
      if (resisted) damageNarrative += ` (resisted)`;

      narrative = `You use ${ability.name} on ${target.name} and ${damageNarrative}!`;
      
      if (newState.enemies[enemyIndex].currentHealth <= 0) {
        narrative += ` ${target.name} is defeated!`;
      }

      // Apply effects
      if (ability.effects) {
        ability.effects.forEach(effect => {
          if (Math.random() * 100 < (effect.chance || 100)) {
            if (effect.type === 'heal') {
              const healAmount = effect.value;
              newPlayerStats.currentHealth = Math.min(
                newPlayerStats.maxHealth,
                newPlayerStats.currentHealth + healAmount
              );
              narrative += ` You recover ${healAmount} health.`;
            } else if (effect.duration) {
              // Add status effect to enemy
              newState.enemies[enemyIndex].activeEffects = [
                ...(newState.enemies[enemyIndex].activeEffects || []),
                { effect, turnsRemaining: effect.duration }
              ];
              narrative += ` ${target.name} is affected by ${effect.type}!`;
            }
          }
        });
      }

      // Log the action
      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: ability.name,
        target: target.name,
        damage,
        narrative,
        timestamp: Date.now()
      });
      break;
    }

    case 'defend': {
      newState.playerDefending = true;
      narrative = 'You raise your guard, reducing incoming damage by 50% this turn.';
      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: 'defend',
        narrative,
        timestamp: Date.now()
      });
      break;
    }

    case 'flee': {
      if (!newState.fleeAllowed) {
        narrative = 'You cannot flee from this battle!';
        break;
      }
      // Flee chance based on sneak/agility
      const fleeChance = 50 + playerStats.dodgeChance;
      if (Math.random() * 100 < fleeChance) {
        newState.result = 'fled';
        newState.active = false;
        narrative = 'You successfully escape from combat!';
      } else {
        narrative = 'You failed to escape! The enemies block your path.';
      }
      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: 'flee',
        narrative,
        timestamp: Date.now()
      });
      break;
    }

    case 'surrender': {
      if (!newState.surrenderAllowed) {
        narrative = 'These enemies will not accept your surrender!';
        break;
      }
      newState.result = 'surrendered';
      newState.active = false;
      narrative = 'You lay down your arms and surrender...';
      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: 'surrender',
        narrative,
        timestamp: Date.now()
      });
      break;
    }

    case 'item': {
      // Item usage in combat - healing potions and food
      console.log('Item action:', { itemId, inventory });
      if (!itemId || !inventory) {
        narrative = 'No item selected or inventory not available!';
        break;
      }

      // Find the item in inventory
      const itemIndex = inventory.findIndex(item => item.id === itemId);
      console.log('Item index:', itemIndex, 'item:', inventory[itemIndex]);
      if (itemIndex === -1) {
        narrative = 'Item not found in inventory!';
        break;
      }

      const item = inventory[itemIndex];
      if (item.quantity <= 0) {
        narrative = 'You don\'t have any of that item!';
        break;
      }

      let healAmount = 0;
      let usedItem: InventoryItem | undefined;

      // Handle different item types
      if (item.type === 'potion') {
        // All potions provide healing - use damage value or default to 35
        healAmount = item.damage || 35;
        usedItem = item;
        console.log('Potion healing:', healAmount);
      } else if (item.type === 'food' || item.type === 'drink') {
        // Food/drink item - use nutrition data for healing or fallback
        const nutrition = getFoodNutrition(item.name);
        if (nutrition) {
          // Food provides healing based on nutrition value
          healAmount = Math.floor(nutrition.hungerReduction / 2) + 10; // 10-25 health from food
        } else {
          // Fallback healing for food without nutrition data
          healAmount = 15;
        }
        usedItem = item;
        console.log('Food healing:', healAmount, 'nutrition:', nutrition);
      }

      console.log('Heal amount:', healAmount, 'usedItem:', usedItem);
      if (healAmount > 0 && usedItem) {
        const actualHeal = Math.min(healAmount, newPlayerStats.maxHealth - newPlayerStats.currentHealth);
        newPlayerStats.currentHealth += actualHeal;
        console.log('Actual heal:', actualHeal, 'new health:', newPlayerStats.currentHealth);

        // Remove one from inventory
        const updatedItem = { ...item, quantity: item.quantity - 1 };
        inventory[itemIndex] = updatedItem;

        narrative = `You consume ${item.name} and recover ${actualHeal} health!`;

        if (actualHeal < healAmount) {
          narrative += ` (You were already near full health)`;
        }

        newState.combatLog.push({
          turn: newState.turn,
          actor: 'player',
          action: 'item',
          target: item.name,
          narrative,
          timestamp: Date.now()
        });

        return { newState, newPlayerStats, narrative, usedItem: updatedItem };
      } else {
        narrative = `You cannot use ${item.name} in combat.`;
      }

      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: 'item',
        target: item.name,
        narrative,
        timestamp: Date.now()
      });
      break;
    }
  }

  return { newState, newPlayerStats, narrative };
};

// ============================================================================
// ENEMY AI & ACTIONS
// ============================================================================

export const executeEnemyTurn = (
  state: CombatState,
  enemyId: string,
  playerStats: PlayerCombatStats
): { newState: CombatState; newPlayerStats: PlayerCombatStats; narrative: string } => {
  let newState = { ...state };
  let newPlayerStats = { ...playerStats };
  
  const enemy = newState.enemies.find(e => e.id === enemyId);
  if (!enemy || enemy.currentHealth <= 0) {
    return { newState, newPlayerStats, narrative: '' };
  }

  // Process enemy status effects
  if (enemy.activeEffects && enemy.activeEffects.length > 0) {
    enemy.activeEffects.forEach(ae => {
      if (ae.effect.type === 'dot') {
        const dotDamage = ae.effect.value;
        enemy.currentHealth = Math.max(0, enemy.currentHealth - dotDamage);
      }
      if (ae.effect.type === 'stun' && ae.turnsRemaining > 0) {
        // Enemy is stunned, skip turn
        newState.combatLog.push({
          turn: newState.turn,
          actor: enemy.name,
          action: 'stunned',
          narrative: `${enemy.name} is stunned and cannot act!`,
          timestamp: Date.now()
        });
        return { newState, newPlayerStats, narrative: `${enemy.name} is stunned!` };
      }
    });
    // Decrement effect durations
    enemy.activeEffects = enemy.activeEffects
      .map(ae => ({ ...ae, turnsRemaining: ae.turnsRemaining - 1 }))
      .filter(ae => ae.turnsRemaining > 0);
  }

  // Choose ability based on behavior
  let chosenAbility: CombatAbility;
  const availableAbilities = enemy.abilities.filter(a => {
    if (a.type === 'magic' && enemy.currentMagicka && enemy.currentMagicka < a.cost) return false;
    if (a.type === 'melee' && enemy.currentStamina && enemy.currentStamina < a.cost) return false;
    return true;
  });

  switch (enemy.behavior) {
    case 'aggressive':
    case 'berserker':
      // Pick highest damage ability
      chosenAbility = availableAbilities.reduce((best, curr) => 
        curr.damage > best.damage ? curr : best, availableAbilities[0]);
      break;
    case 'defensive':
      // Pick lower cost abilities
      chosenAbility = availableAbilities.reduce((best, curr) => 
        curr.cost < best.cost ? curr : best, availableAbilities[0]);
      break;
    case 'tactical':
      // Use abilities with effects more often
      const withEffects = availableAbilities.filter(a => a.effects && a.effects.length > 0);
      chosenAbility = withEffects.length > 0 && Math.random() > 0.5 
        ? withEffects[Math.floor(Math.random() * withEffects.length)]
        : availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
      break;
    default:
      chosenAbility = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
  }

  if (!chosenAbility) {
    chosenAbility = { 
      id: 'basic', 
      name: 'Attack', 
      type: 'melee', 
      damage: enemy.damage, 
      cost: 0, 
      description: 'Basic attack' 
    };
  }

  // Calculate damage to player
  let { damage, isCrit } = calculateDamage(
    chosenAbility.damage,
    enemy.level,
    playerStats.armor,
    [],
    chosenAbility.type === 'magic' ? 'magic' : undefined,
    10 // Enemy crit chance
  );

  // Dodge check
  if (Math.random() * 100 < playerStats.dodgeChance) {
    damage = 0;
  }

  // Defending reduces damage
  if (newState.playerDefending) {
    damage = Math.floor(damage * 0.5);
  }

  // Apply damage to player
  newPlayerStats.currentHealth = Math.max(0, newPlayerStats.currentHealth - damage);

  // Build narrative
  let narrative = `${enemy.name} uses ${chosenAbility.name}`;
  if (damage === 0) {
    narrative += ` but you dodge the attack!`;
  } else {
    narrative += ` and deals ${damage} damage!`;
    if (isCrit) narrative = `${enemy.name} lands a CRITICAL HIT with ${chosenAbility.name} for ${damage} damage!`;
  }

  if (newPlayerStats.currentHealth <= 0) {
    narrative += ` You have been defeated...`;
    newState.result = 'defeat';
    newState.active = false;
  }

  // Log
  newState.combatLog.push({
    turn: newState.turn,
    actor: enemy.name,
    action: chosenAbility.name,
    target: 'player',
    damage,
    narrative,
    timestamp: Date.now()
  });

  return { newState, newPlayerStats, narrative };
};

// ============================================================================
// TURN MANAGEMENT
// ============================================================================

export const advanceTurn = (state: CombatState): CombatState => {
  const newState = { ...state };
  
  // Find next actor in turn order
  const currentIndex = newState.turnOrder.indexOf(newState.currentTurnActor);
  let nextIndex = (currentIndex + 1) % newState.turnOrder.length;
  
  // Skip dead enemies
  while (nextIndex !== currentIndex) {
    const nextActor = newState.turnOrder[nextIndex];
    if (nextActor === 'player') break;
    const enemy = newState.enemies.find(e => e.id === nextActor);
    if (enemy && enemy.currentHealth > 0) break;
    nextIndex = (nextIndex + 1) % newState.turnOrder.length;
  }
  
  newState.currentTurnActor = newState.turnOrder[nextIndex];
  
  // If we've cycled back to start, increment turn
  if (nextIndex <= currentIndex || nextIndex === 0) {
    newState.turn++;
    // Reduce cooldowns
    Object.keys(newState.abilityCooldowns).forEach(key => {
      if (newState.abilityCooldowns[key] > 0) {
        newState.abilityCooldowns[key]--;
      }
    });
    // Reset defending
    newState.playerDefending = false;
  }
  
  return newState;
};

export const checkCombatEnd = (state: CombatState, playerStats: PlayerCombatStats): CombatState => {
  const newState = { ...state };
  
  // Check if all enemies are defeated
  const allEnemiesDefeated = newState.enemies.every(e => e.currentHealth <= 0);
  if (allEnemiesDefeated) {
    newState.result = 'victory';
    newState.active = false;
    
    // Calculate rewards
    const xp = newState.enemies.reduce((sum, e) => sum + e.xpReward, 0);
    const gold = newState.enemies.reduce((sum, e) => sum + (e.goldReward || 0), 0);
    const items: Array<{ name: string; type: string; description: string; quantity: number }> = [];
    
    newState.enemies.forEach(enemy => {
      enemy.loot?.forEach(lootItem => {
        if (Math.random() * 100 < lootItem.dropChance) {
          items.push({
            name: lootItem.name,
            type: lootItem.type,
            description: lootItem.description,
            quantity: lootItem.quantity
          });
        }
      });
    });
    
    newState.rewards = { xp, gold, items };
    
    newState.combatLog.push({
      turn: newState.turn,
      actor: 'system',
      action: 'victory',
      narrative: `Victory! You have defeated all enemies and earned ${xp} XP${gold > 0 ? ` and ${gold} gold` : ''}!`,
      timestamp: Date.now()
    });
  }
  
  // Check player defeat
  if (playerStats.currentHealth <= 0) {
    newState.result = 'defeat';
    newState.active = false;
    newState.combatLog.push({
      turn: newState.turn,
      actor: 'system',
      action: 'defeat',
      narrative: 'You have been defeated...',
      timestamp: Date.now()
    });
  }
  
  return newState;
};

// ============================================================================
// ENEMY TEMPLATES
// ============================================================================

// ============================================================================
// BASE ENEMY TEMPLATES - Used as foundation for dynamic generation
// ============================================================================

interface BaseEnemyTemplate {
  baseName: string;
  type: 'humanoid' | 'beast' | 'undead' | 'daedra' | 'automaton';
  baseLevel: number;
  baseHealth: number;
  baseArmor: number;
  baseDamage: number;
  behaviors: ('aggressive' | 'defensive' | 'tactical' | 'berserker')[];
  possibleAbilities: CombatAbility[];
  weaknesses?: string[];
  resistances?: string[];
  isBoss?: boolean;
  baseXP: number;
  baseGold?: number;
  possibleLoot: { name: string; type: string; description: string; quantity: number; dropChance: number; damage?: number; armor?: number; slot?: string }[];
}

const BASE_ENEMY_TEMPLATES: Record<string, BaseEnemyTemplate> = {
  bandit: {
    baseName: 'Bandit',
    type: 'humanoid',
    baseLevel: 5,
    baseHealth: 50,
    baseArmor: 15,
    baseDamage: 12,
    behaviors: ['aggressive', 'tactical', 'defensive'],
    possibleAbilities: [
      { id: 'slash', name: 'Slash', type: 'melee', damage: 12, cost: 10, description: 'A quick slash' },
      { id: 'stab', name: 'Stab', type: 'melee', damage: 14, cost: 12, description: 'A precise thrust' },
      { id: 'bash', name: 'Shield Bash', type: 'melee', damage: 8, cost: 5, description: 'Shield bash', effects: [{ type: 'stun', value: 1, duration: 1, chance: 20 }] },
      { id: 'throw_dagger', name: 'Throw Dagger', type: 'ranged', damage: 10, cost: 8, description: 'Throw a concealed dagger' },
      { id: 'dirty_trick', name: 'Dirty Trick', type: 'melee', damage: 6, cost: 5, description: 'Throw sand in eyes', effects: [{ type: 'debuff', stat: 'damage', value: -5, duration: 2, chance: 40 }] },
      { id: 'desperate_strike', name: 'Desperate Strike', type: 'melee', damage: 18, cost: 20, description: 'A reckless powerful attack' }
    ],
    baseXP: 25,
    baseGold: 15,
    possibleLoot: [
      { name: 'Iron Sword', type: 'weapon', description: 'A common iron sword', quantity: 1, dropChance: 20, damage: 8, slot: 'weapon' },
      { name: 'Iron Dagger', type: 'weapon', description: 'A simple iron dagger', quantity: 1, dropChance: 25, damage: 5, slot: 'weapon' },
      { name: 'Leather Armor', type: 'apparel', description: 'Basic leather armor', quantity: 1, dropChance: 15, armor: 12, slot: 'chest' },
      { name: 'Fur Boots', type: 'apparel', description: 'Worn fur boots', quantity: 1, dropChance: 20, armor: 3, slot: 'feet' },
      { name: 'Lockpick', type: 'misc', description: 'A lockpick', quantity: 2, dropChance: 35 },
      { name: 'Ale', type: 'drink', description: 'Cheap ale', quantity: 1, dropChance: 40 },
      { name: 'Bread', type: 'food', description: 'Stale bread', quantity: 1, dropChance: 30 }
    ]
  },
  wolf: {
    baseName: 'Wolf',
    type: 'beast',
    baseLevel: 3,
    baseHealth: 30,
    baseArmor: 5,
    baseDamage: 10,
    behaviors: ['aggressive', 'berserker'],
    possibleAbilities: [
      { id: 'bite', name: 'Bite', type: 'melee', damage: 10, cost: 5, description: 'A vicious bite' },
      { id: 'pounce', name: 'Pounce', type: 'melee', damage: 15, cost: 15, description: 'Leap and attack', effects: [{ type: 'stun', value: 1, duration: 1, chance: 15 }] },
      { id: 'savage_bite', name: 'Savage Bite', type: 'melee', damage: 14, cost: 12, description: 'A tearing bite', effects: [{ type: 'dot', stat: 'health', value: 2, duration: 2, chance: 30 }] },
      { id: 'howl', name: 'Howl', type: 'melee', damage: 0, cost: 10, description: 'A terrifying howl', effects: [{ type: 'debuff', stat: 'damage', value: -3, duration: 2, chance: 25 }] }
    ],
    baseXP: 15,
    possibleLoot: [
      { name: 'Wolf Pelt', type: 'misc', description: 'A wolf pelt', quantity: 1, dropChance: 80 },
      { name: 'Raw Meat', type: 'food', description: 'Raw wolf meat', quantity: 1, dropChance: 60 },
      { name: 'Wolf Fang', type: 'ingredient', description: 'A sharp wolf fang', quantity: 1, dropChance: 40 }
    ]
  },
  skeleton: {
    baseName: 'Skeleton',
    type: 'undead',
    baseLevel: 6,
    baseHealth: 40,
    baseArmor: 20,
    baseDamage: 14,
    behaviors: ['defensive', 'tactical'],
    weaknesses: ['fire', 'blunt'],
    resistances: ['frost', 'poison'],
    possibleAbilities: [
      { id: 'bone_strike', name: 'Bone Strike', type: 'melee', damage: 14, cost: 10, description: 'Strike with bony limbs' },
      { id: 'bone_claw', name: 'Bone Claw', type: 'melee', damage: 12, cost: 8, description: 'Slash with sharp bone claws' },
      { id: 'rattle', name: 'Bone Rattle', type: 'melee', damage: 0, cost: 5, description: 'An unsettling rattle', effects: [{ type: 'debuff', stat: 'damage', value: -4, duration: 1, chance: 35 }] },
      { id: 'bone_throw', name: 'Bone Throw', type: 'ranged', damage: 8, cost: 6, description: 'Throw a bone shard' }
    ],
    baseXP: 30,
    possibleLoot: [
      { name: 'Bone Meal', type: 'ingredient', description: 'Ground bones', quantity: 1, dropChance: 70 },
      { name: 'Ancient Coin', type: 'misc', description: 'An old coin from a past era', quantity: 1, dropChance: 25 },
      { name: 'Tattered Cloth', type: 'misc', description: 'Rotting burial cloth', quantity: 1, dropChance: 40 }
    ]
  },
  draugr: {
    baseName: 'Draugr',
    type: 'undead',
    baseLevel: 8,
    baseHealth: 70,
    baseArmor: 30,
    baseDamage: 18,
    behaviors: ['tactical', 'defensive', 'aggressive'],
    weaknesses: ['fire'],
    resistances: ['frost'],
    possibleAbilities: [
      { id: 'ancient_blade', name: 'Ancient Blade', type: 'melee', damage: 18, cost: 15, description: 'Strike with an ancient Nord weapon' },
      { id: 'frost_breath', name: 'Frost Breath', type: 'magic', damage: 20, cost: 20, description: 'Breathe frost', effects: [{ type: 'debuff', stat: 'stamina', value: -15, duration: 2 }] },
      { id: 'disarm_shout', name: 'Disarm Shout', type: 'magic', damage: 5, cost: 25, description: 'A thu\'um that weakens', effects: [{ type: 'debuff', stat: 'damage', value: -8, duration: 2, chance: 50 }] },
      { id: 'shield_wall', name: 'Shield Wall', type: 'melee', damage: 0, cost: 15, description: 'Raise ancient shield', effects: [{ type: 'buff', stat: 'armor', value: 15, duration: 2 }] },
      { id: 'cleave', name: 'Cleave', type: 'melee', damage: 22, cost: 18, description: 'A sweeping axe strike' }
    ],
    baseXP: 50,
    baseGold: 25,
    possibleLoot: [
      { name: 'Ancient Nord Sword', type: 'weapon', description: 'An ancient Nord blade', quantity: 1, dropChance: 25, damage: 12, slot: 'weapon' },
      { name: 'Ancient Nord War Axe', type: 'weapon', description: 'A weathered Nord axe', quantity: 1, dropChance: 20, damage: 14, slot: 'weapon' },
      { name: 'Linen Wrap', type: 'misc', description: 'Burial wrappings', quantity: 2, dropChance: 60 },
      { name: 'Draugr Bones', type: 'ingredient', description: 'Ancient bones', quantity: 1, dropChance: 45 },
      { name: 'Ancient Nord Helmet', type: 'apparel', description: 'A dented Nord helmet', quantity: 1, dropChance: 15, armor: 15, slot: 'head' }
    ]
  },
  frost_spider: {
    baseName: 'Frostbite Spider',
    type: 'beast',
    baseLevel: 7,
    baseHealth: 55,
    baseArmor: 10,
    baseDamage: 16,
    behaviors: ['aggressive', 'tactical'],
    resistances: ['frost'],
    weaknesses: ['fire'],
    possibleAbilities: [
      { id: 'bite', name: 'Venomous Bite', type: 'melee', damage: 16, cost: 10, description: 'A poisonous bite', effects: [{ type: 'dot', stat: 'health', value: 4, duration: 3, chance: 50 }] },
      { id: 'web', name: 'Web Spray', type: 'ranged', damage: 5, cost: 15, description: 'Spray sticky web', effects: [{ type: 'debuff', stat: 'stamina', value: -20, duration: 2 }] },
      { id: 'lunge', name: 'Lunge', type: 'melee', damage: 18, cost: 14, description: 'A sudden lunge attack' },
      { id: 'spit_venom', name: 'Spit Venom', type: 'ranged', damage: 10, cost: 12, description: 'Spit corrosive venom', effects: [{ type: 'dot', stat: 'health', value: 3, duration: 2, chance: 60 }] }
    ],
    baseXP: 35,
    possibleLoot: [
      { name: 'Frostbite Venom', type: 'ingredient', description: 'Potent spider venom', quantity: 1, dropChance: 60 },
      { name: 'Spider Egg', type: 'ingredient', description: 'A spider egg', quantity: 2, dropChance: 40 },
      { name: 'Webbing', type: 'misc', description: 'Strong spider silk', quantity: 1, dropChance: 50 }
    ]
  },
  troll: {
    baseName: 'Troll',
    type: 'beast',
    baseLevel: 14,
    baseHealth: 150,
    baseArmor: 25,
    baseDamage: 30,
    behaviors: ['aggressive', 'berserker'],
    weaknesses: ['fire'],
    possibleAbilities: [
      { id: 'slam', name: 'Slam', type: 'melee', damage: 30, cost: 15, description: 'A powerful slam attack' },
      { id: 'rend', name: 'Rend', type: 'melee', damage: 25, cost: 12, description: 'Tear with claws', effects: [{ type: 'dot', stat: 'health', value: 5, duration: 3, chance: 40 }] },
      { id: 'regenerate', name: 'Regenerate', type: 'melee', damage: 0, cost: 20, description: 'Troll regeneration', effects: [{ type: 'heal', stat: 'health', value: 20 }] },
      { id: 'frenzy', name: 'Frenzy', type: 'melee', damage: 35, cost: 25, description: 'A frenzied assault', cooldown: 2 }
    ],
    baseXP: 100,
    possibleLoot: [
      { name: 'Troll Fat', type: 'ingredient', description: 'Greasy troll fat', quantity: 1, dropChance: 80 },
      { name: 'Troll Skull', type: 'misc', description: 'A massive troll skull', quantity: 1, dropChance: 30 }
    ]
  },
  bear: {
    baseName: 'Bear',
    type: 'beast',
    baseLevel: 10,
    baseHealth: 100,
    baseArmor: 20,
    baseDamage: 25,
    behaviors: ['aggressive', 'berserker', 'defensive'],
    possibleAbilities: [
      { id: 'swipe', name: 'Swipe', type: 'melee', damage: 25, cost: 12, description: 'A powerful claw swipe' },
      { id: 'maul', name: 'Maul', type: 'melee', damage: 35, cost: 20, description: 'A devastating maul attack', effects: [{ type: 'dot', stat: 'health', value: 4, duration: 2, chance: 35 }] },
      { id: 'roar', name: 'Roar', type: 'melee', damage: 0, cost: 10, description: 'A terrifying roar', effects: [{ type: 'debuff', stat: 'stamina', value: -15, duration: 2, chance: 50 }] },
      { id: 'charge', name: 'Charge', type: 'melee', damage: 30, cost: 18, description: 'A charging attack', effects: [{ type: 'stun', value: 1, duration: 1, chance: 30 }] }
    ],
    baseXP: 70,
    possibleLoot: [
      { name: 'Bear Pelt', type: 'misc', description: 'A thick bear pelt', quantity: 1, dropChance: 85 },
      { name: 'Bear Claws', type: 'ingredient', description: 'Sharp bear claws', quantity: 2, dropChance: 60 },
      { name: 'Raw Meat', type: 'food', description: 'Raw bear meat', quantity: 2, dropChance: 70 }
    ]
  },
  sabre_cat: {
    baseName: 'Sabre Cat',
    type: 'beast',
    baseLevel: 12,
    baseHealth: 80,
    baseArmor: 15,
    baseDamage: 28,
    behaviors: ['aggressive', 'tactical'],
    possibleAbilities: [
      { id: 'bite', name: 'Sabre Bite', type: 'melee', damage: 28, cost: 10, description: 'A vicious bite with massive fangs' },
      { id: 'pounce', name: 'Pounce', type: 'melee', damage: 35, cost: 18, description: 'A leaping pounce attack', effects: [{ type: 'stun', value: 1, duration: 1, chance: 25 }] },
      { id: 'claw_swipe', name: 'Claw Swipe', type: 'melee', damage: 24, cost: 12, description: 'Quick claw attack', effects: [{ type: 'dot', stat: 'health', value: 3, duration: 2, chance: 30 }] },
      { id: 'rake', name: 'Rake', type: 'melee', damage: 20, cost: 8, description: 'A raking attack with hind claws' }
    ],
    baseXP: 80,
    possibleLoot: [
      { name: 'Sabre Cat Pelt', type: 'misc', description: 'A prized sabre cat pelt', quantity: 1, dropChance: 85 },
      { name: 'Sabre Cat Tooth', type: 'ingredient', description: 'A massive fang', quantity: 2, dropChance: 70 },
      { name: 'Eye of Sabre Cat', type: 'ingredient', description: 'A cat eye', quantity: 1, dropChance: 40 }
    ]
  },
  vampire: {
    baseName: 'Vampire',
    type: 'undead',
    baseLevel: 15,
    baseHealth: 90,
    baseArmor: 35,
    baseDamage: 25,
    behaviors: ['tactical', 'defensive', 'aggressive'],
    weaknesses: ['fire', 'sunlight'],
    resistances: ['frost', 'poison'],
    possibleAbilities: [
      { id: 'drain_life', name: 'Drain Life', type: 'magic', damage: 25, cost: 20, description: 'Drain the life force', effects: [{ type: 'heal', stat: 'health', value: 15 }] },
      { id: 'vampiric_claw', name: 'Vampiric Claw', type: 'melee', damage: 22, cost: 12, description: 'A clawed strike' },
      { id: 'ice_spike', name: 'Ice Spike', type: 'magic', damage: 28, cost: 25, description: 'A spike of ice', effects: [{ type: 'debuff', stat: 'stamina', value: -10, duration: 2 }] },
      { id: 'invisibility', name: 'Cloak of Shadows', type: 'magic', damage: 0, cost: 30, description: 'Become harder to hit', effects: [{ type: 'buff', stat: 'armor', value: 25, duration: 2 }] },
      { id: 'raise_zombie', name: 'Raise Zombie', type: 'magic', damage: 0, cost: 35, description: 'Summon undead aid', effects: [{ type: 'buff', stat: 'damage', value: 10, duration: 3 }] }
    ],
    baseXP: 120,
    baseGold: 50,
    possibleLoot: [
      { name: 'Vampire Dust', type: 'ingredient', description: 'Ashes of the undead', quantity: 1, dropChance: 90 },
      { name: 'Soul Gem (Petty)', type: 'misc', description: 'A small soul gem', quantity: 1, dropChance: 35 },
      { name: 'Vampire Robes', type: 'apparel', description: 'Dark enchanted robes', quantity: 1, dropChance: 25, armor: 20, slot: 'chest' },
      { name: 'Health Potion', type: 'potion', description: 'Restores health', quantity: 1, dropChance: 40 }
    ]
  },
  mage: {
    baseName: 'Hostile Mage',
    type: 'humanoid',
    baseLevel: 10,
    baseHealth: 60,
    baseArmor: 10,
    baseDamage: 20,
    behaviors: ['tactical', 'defensive'],
    resistances: ['magic'],
    possibleAbilities: [
      { id: 'firebolt', name: 'Firebolt', type: 'magic', damage: 25, cost: 20, description: 'A bolt of fire' },
      { id: 'ice_spike', name: 'Ice Spike', type: 'magic', damage: 22, cost: 18, description: 'A spike of ice' },
      { id: 'lightning', name: 'Lightning Bolt', type: 'magic', damage: 28, cost: 25, description: 'A bolt of lightning', effects: [{ type: 'drain', stat: 'magicka', value: 10 }] },
      { id: 'ward', name: 'Lesser Ward', type: 'magic', damage: 0, cost: 15, description: 'A protective ward', effects: [{ type: 'buff', stat: 'armor', value: 20, duration: 2 }] },
      { id: 'flames', name: 'Flames', type: 'magic', damage: 15, cost: 10, description: 'A stream of fire', effects: [{ type: 'dot', stat: 'health', value: 3, duration: 2, chance: 40 }] }
    ],
    baseXP: 60,
    baseGold: 30,
    possibleLoot: [
      { name: 'Filled Petty Soul Gem', type: 'misc', description: 'A filled soul gem', quantity: 1, dropChance: 45 },
      { name: 'Magicka Potion', type: 'potion', description: 'Restores magicka', quantity: 1, dropChance: 50 },
      { name: 'Mage Robes', type: 'apparel', description: 'Simple mage robes', quantity: 1, dropChance: 30, armor: 8, slot: 'chest' },
      { name: 'Spell Tome', type: 'misc', description: 'A tome of magic', quantity: 1, dropChance: 20 }
    ]
  },
  bandit_chief: {
    baseName: 'Bandit Chief',
    type: 'humanoid',
    baseLevel: 12,
    baseHealth: 120,
    baseArmor: 50,
    baseDamage: 25,
    behaviors: ['tactical', 'aggressive'],
    isBoss: true,
    possibleAbilities: [
      { id: 'heavy_strike', name: 'Heavy Strike', type: 'melee', damage: 25, cost: 15, description: 'A powerful two-handed strike' },
      { id: 'rally', name: 'Rally Cry', type: 'melee', damage: 0, cost: 20, description: 'Boost attack power', effects: [{ type: 'buff', stat: 'damage', value: 10, duration: 3 }] },
      { id: 'execute', name: 'Execution', type: 'melee', damage: 40, cost: 30, description: 'A devastating finishing blow', cooldown: 3 },
      { id: 'intimidate', name: 'Intimidate', type: 'melee', damage: 0, cost: 15, description: 'A terrifying shout', effects: [{ type: 'debuff', stat: 'damage', value: -8, duration: 2, chance: 60 }] },
      { id: 'cleave', name: 'Cleave', type: 'melee', damage: 30, cost: 20, description: 'A sweeping attack' }
    ],
    baseXP: 150,
    baseGold: 100,
    possibleLoot: [
      { name: 'Steel Greatsword', type: 'weapon', description: 'A well-made steel greatsword', quantity: 1, dropChance: 50, damage: 18, slot: 'weapon' },
      { name: 'Steel Armor', type: 'apparel', description: 'Heavy steel armor', quantity: 1, dropChance: 40, armor: 35, slot: 'chest' },
      { name: 'Bandit Chief\'s Key', type: 'key', description: 'Opens the chief\'s treasure chest', quantity: 1, dropChance: 100 },
      { name: 'Potion of Ultimate Healing', type: 'potion', description: 'Restores a lot of health', quantity: 1, dropChance: 60 }
    ]
  }
};

// Legacy export for backwards compatibility
export const ENEMY_TEMPLATES: Record<string, Omit<CombatEnemy, 'id'>> = Object.fromEntries(
  Object.entries(BASE_ENEMY_TEMPLATES).map(([key, template]) => [
    key,
    {
      name: template.baseName,
      type: template.type,
      level: template.baseLevel,
      maxHealth: template.baseHealth,
      currentHealth: template.baseHealth,
      armor: template.baseArmor,
      damage: template.baseDamage,
      behavior: template.behaviors[0],
      weaknesses: template.weaknesses,
      resistances: template.resistances,
      isBoss: template.isBoss,
      abilities: template.possibleAbilities.slice(0, 3),
      xpReward: template.baseXP,
      goldReward: template.baseGold,
      loot: template.possibleLoot.slice(0, 3)
    }
  ])
);

// ============================================================================
// DYNAMIC ENEMY GENERATION
// ============================================================================

/**
 * Generate a unique enemy with randomized stats, abilities, and personality
 * Each enemy is different even from the same template!
 */
export const createEnemyFromTemplate = (
  templateId: string, 
  options: {
    nameOverride?: string;
    levelModifier?: number;  // -3 to +5 level adjustment
    isElite?: boolean;       // Elite enemies have better stats
    forceUnique?: boolean;   // Always generate unique name
  } = {}
): CombatEnemy => {
  const template = BASE_ENEMY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown enemy template: ${templateId}`);
  }

  const { nameOverride, levelModifier = 0, isElite = false, forceUnique = true } = options;
  
  // Generate unique name
  let name = template.baseName;
  if (forceUnique || Math.random() < 0.7) {
    const prefixes = ENEMY_NAME_PREFIXES[templateId] || ENEMY_NAME_PREFIXES.default;
    const prefix = randomChoice(prefixes);
    name = `${prefix} ${template.baseName}`;
  }
  if (nameOverride) name = nameOverride;

  // Calculate level with variation
  const baseLevel = template.baseLevel + levelModifier;
  const level = Math.max(1, randomRange(baseLevel - 1, baseLevel + 2));
  
  // Scale stats based on level difference and add random variation (±15%)
  const levelScale = 1 + (level - template.baseLevel) * 0.1;
  const variance = 0.15; // 15% variance
  
  const maxHealth = Math.max(10, randomVariation(Math.floor(template.baseHealth * levelScale), variance));
  const armor = Math.max(0, randomVariation(Math.floor(template.baseArmor * levelScale), variance));
  const damage = Math.max(5, randomVariation(Math.floor(template.baseDamage * levelScale), variance));
  
  // Elite enemies get significant boost
  const eliteMultiplier = isElite ? 1.5 : 1;
  const finalHealth = Math.floor(maxHealth * eliteMultiplier);
  const finalArmor = Math.floor(armor * eliteMultiplier);
  const finalDamage = Math.floor(damage * eliteMultiplier);

  // Randomly select behavior from available options
  const behavior = randomChoice(template.behaviors);
  
  // Select random subset of abilities (2-4 abilities)
  const numAbilities = randomRange(2, Math.min(4, template.possibleAbilities.length));
  const shuffledAbilities = shuffleArray(template.possibleAbilities);
  const selectedAbilities = shuffledAbilities.slice(0, numAbilities).map(ability => ({
    ...ability,
    // Scale ability damage with level
    damage: Math.max(1, Math.floor(ability.damage * levelScale * (isElite ? 1.2 : 1))),
    // Unique ID for this instance
    id: `${ability.id}_${Math.random().toString(36).substr(2, 5)}`
  }));

  // Calculate rewards with variation
  const xpReward = Math.floor(randomVariation(template.baseXP * levelScale, 0.2) * (isElite ? 2 : 1));
  const goldReward = template.baseGold 
    ? Math.floor(randomVariation(template.baseGold * levelScale, 0.3) * (isElite ? 2.5 : 1))
    : undefined;

  // Select random loot (with slight drop chance variation)
  const loot = template.possibleLoot.map(item => ({
    ...item,
    dropChance: Math.min(100, item.dropChance + randomRange(-10, 15))
  }));

  // Generate personality trait for narrative variety
  const personality = randomChoice(ENEMY_PERSONALITY_TRAITS);

  return {
    id: `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: isElite ? `${name} (Elite)` : name,
    type: template.type,
    level,
    maxHealth: finalHealth,
    currentHealth: finalHealth,
    maxMagicka: template.type === 'undead' || templateId === 'mage' || templateId === 'vampire' ? 50 + level * 5 : undefined,
    currentMagicka: template.type === 'undead' || templateId === 'mage' || templateId === 'vampire' ? 50 + level * 5 : undefined,
    maxStamina: 50 + level * 3,
    currentStamina: 50 + level * 3,
    armor: finalArmor,
    damage: finalDamage,
    behavior,
    weaknesses: template.weaknesses,
    resistances: template.resistances,
    abilities: selectedAbilities,
    isBoss: template.isBoss || isElite,
    xpReward,
    goldReward,
    loot,
    activeEffects: [],
    // Store personality for narrative use
    description: `A ${personality} ${template.baseName.toLowerCase()}`
  };
};

/**
 * Generate a group of enemies with variety
 * Useful for creating enemy parties/encounters
 */
export const generateEnemyGroup = (
  templateId: string,
  count: number,
  options: {
    includeElite?: boolean;    // Include one elite enemy?
    levelVariance?: number;    // Level spread within group
    uniqueNames?: boolean;     // Ensure unique names
  } = {}
): CombatEnemy[] => {
  const { includeElite = false, levelVariance = 2, uniqueNames = true } = options;
  const usedNames = new Set<string>();
  const enemies: CombatEnemy[] = [];

  for (let i = 0; i < count; i++) {
    const isThisElite = includeElite && i === 0; // First enemy is elite if requested
    const levelMod = randomRange(-levelVariance, levelVariance);
    
    let enemy: CombatEnemy;
    let attempts = 0;
    do {
      enemy = createEnemyFromTemplate(templateId, {
        levelModifier: levelMod,
        isElite: isThisElite,
        forceUnique: uniqueNames
      });
      attempts++;
    } while (uniqueNames && usedNames.has(enemy.name) && attempts < 10);
    
    usedNames.add(enemy.name);
    enemies.push(enemy);
  }

  return enemies;
};

/**
 * Generate a mixed enemy encounter (e.g., bandits with a chief)
 */
export const generateMixedEncounter = (
  mainType: string,
  mainCount: number,
  leaderType?: string
): CombatEnemy[] => {
  const enemies = generateEnemyGroup(mainType, mainCount, { uniqueNames: true });
  
  if (leaderType) {
    const leader = createEnemyFromTemplate(leaderType, { isElite: true });
    enemies.push(leader);
  }
  
  return enemies;
};
