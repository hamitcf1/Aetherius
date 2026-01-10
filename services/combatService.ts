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
  itemId?: string
): { newState: CombatState; newPlayerStats: PlayerCombatStats; narrative: string } => {
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
      // Item usage would be handled by checking inventory
      // For now, placeholder
      narrative = 'You use an item.';
      newState.combatLog.push({
        turn: newState.turn,
        actor: 'player',
        action: 'item',
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

export const ENEMY_TEMPLATES: Record<string, Omit<CombatEnemy, 'id'>> = {
  bandit: {
    name: 'Bandit',
    type: 'humanoid',
    level: 5,
    maxHealth: 50,
    currentHealth: 50,
    armor: 15,
    damage: 12,
    behavior: 'aggressive',
    abilities: [
      { id: 'slash', name: 'Slash', type: 'melee', damage: 12, cost: 10, description: 'A quick slash' },
      { id: 'bash', name: 'Bash', type: 'melee', damage: 8, cost: 5, description: 'Shield bash', effects: [{ type: 'stun', value: 1, duration: 1, chance: 20 }] }
    ],
    xpReward: 25,
    goldReward: 15,
    loot: [
      { name: 'Iron Sword', type: 'weapon', description: 'A common iron sword', quantity: 1, dropChance: 20 },
      { name: 'Leather Armor', type: 'apparel', description: 'Basic leather armor', quantity: 1, dropChance: 15 }
    ]
  },
  wolf: {
    name: 'Wolf',
    type: 'beast',
    level: 3,
    maxHealth: 30,
    currentHealth: 30,
    armor: 5,
    damage: 10,
    behavior: 'aggressive',
    abilities: [
      { id: 'bite', name: 'Bite', type: 'melee', damage: 10, cost: 5, description: 'A vicious bite' },
      { id: 'pounce', name: 'Pounce', type: 'melee', damage: 15, cost: 15, description: 'Leap and attack', effects: [{ type: 'stun', value: 1, duration: 1, chance: 15 }] }
    ],
    xpReward: 15,
    loot: [
      { name: 'Wolf Pelt', type: 'misc', description: 'A wolf pelt', quantity: 1, dropChance: 80 }
    ]
  },
  skeleton: {
    name: 'Skeleton',
    type: 'undead',
    level: 6,
    maxHealth: 40,
    currentHealth: 40,
    armor: 20,
    damage: 14,
    behavior: 'defensive',
    weaknesses: ['fire', 'blunt'],
    resistances: ['frost', 'poison'],
    abilities: [
      { id: 'bone_strike', name: 'Bone Strike', type: 'melee', damage: 14, cost: 10, description: 'Strike with bony limbs' }
    ],
    xpReward: 30,
    loot: [
      { name: 'Bone Meal', type: 'ingredient', description: 'Ground bones', quantity: 1, dropChance: 70 }
    ]
  },
  draugr: {
    name: 'Draugr',
    type: 'undead',
    level: 8,
    maxHealth: 70,
    currentHealth: 70,
    armor: 30,
    damage: 18,
    behavior: 'tactical',
    weaknesses: ['fire'],
    resistances: ['frost'],
    abilities: [
      { id: 'ancient_blade', name: 'Ancient Blade', type: 'melee', damage: 18, cost: 15, description: 'Strike with an ancient Nord weapon' },
      { id: 'frost_breath', name: 'Frost Breath', type: 'magic', damage: 20, cost: 20, description: 'Breathe frost', effects: [{ type: 'debuff', stat: 'stamina', value: -15, duration: 2 }] }
    ],
    xpReward: 50,
    goldReward: 25,
    loot: [
      { name: 'Ancient Nord Sword', type: 'weapon', description: 'An ancient Nord blade', quantity: 1, dropChance: 25 },
      { name: 'Linen Wrap', type: 'misc', description: 'Burial wrappings', quantity: 2, dropChance: 60 }
    ]
  },
  frost_spider: {
    name: 'Frost Spider',
    type: 'beast',
    level: 7,
    maxHealth: 55,
    currentHealth: 55,
    armor: 10,
    damage: 16,
    behavior: 'aggressive',
    resistances: ['frost'],
    weaknesses: ['fire'],
    abilities: [
      { id: 'bite', name: 'Venomous Bite', type: 'melee', damage: 16, cost: 10, description: 'A poisonous bite', effects: [{ type: 'dot', stat: 'health', value: 4, duration: 3, chance: 50 }] },
      { id: 'web', name: 'Web Spray', type: 'ranged', damage: 5, cost: 15, description: 'Spray sticky web', effects: [{ type: 'debuff', stat: 'stamina', value: -20, duration: 2 }] }
    ],
    xpReward: 35,
    loot: [
      { name: 'Frostbite Venom', type: 'ingredient', description: 'Potent spider venom', quantity: 1, dropChance: 60 },
      { name: 'Spider Egg', type: 'ingredient', description: 'A spider egg', quantity: 2, dropChance: 40 }
    ]
  },
  bandit_chief: {
    name: 'Bandit Chief',
    type: 'humanoid',
    level: 12,
    maxHealth: 120,
    currentHealth: 120,
    armor: 50,
    damage: 25,
    behavior: 'tactical',
    isBoss: true,
    abilities: [
      { id: 'heavy_strike', name: 'Heavy Strike', type: 'melee', damage: 25, cost: 15, description: 'A powerful two-handed strike' },
      { id: 'rally', name: 'Rally Cry', type: 'melee', damage: 0, cost: 20, description: 'Boost attack power', effects: [{ type: 'buff', stat: 'damage', value: 10, duration: 3 }] },
      { id: 'execute', name: 'Execution', type: 'melee', damage: 40, cost: 30, description: 'A devastating finishing blow', cooldown: 3 }
    ],
    xpReward: 150,
    goldReward: 100,
    loot: [
      { name: 'Steel Greatsword', type: 'weapon', description: 'A well-made steel greatsword', quantity: 1, dropChance: 50 },
      { name: 'Bandit Chief\'s Key', type: 'key', description: 'Opens the chief\'s treasure chest', quantity: 1, dropChance: 100 }
    ]
  }
};

// Helper to create enemy from template
export const createEnemyFromTemplate = (templateId: string, nameOverride?: string): CombatEnemy => {
  const template = ENEMY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown enemy template: ${templateId}`);
  }
  return {
    ...template,
    id: `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: nameOverride || template.name,
    currentHealth: template.maxHealth,
    activeEffects: []
  };
};
