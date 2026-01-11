/**
 * CombatModal - Pokemon-style turn-based combat UI
 * Full-screen combat interface with health bars, abilities, and action log
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Character, 
  InventoryItem, 
  CombatState, 
  CombatEnemy,
  CombatAbility,
  PlayerCombatStats,
  CombatActionType
} from '../types';
import {
  calculatePlayerCombatStats,
  executePlayerAction,
  executeEnemyTurn,
  advanceTurn,
  checkCombatEnd
} from '../services/combatService';
import { getEasterEggName } from './GameFeatures';

interface CombatModalProps {
  character: Character;
  inventory: InventoryItem[];
  initialCombatState: CombatState;
  onCombatEnd: (result: 'victory' | 'defeat' | 'fled' | 'surrendered', rewards?: {
    xp: number;
    gold: number;
    items: Array<{ name: string; type: string; description: string; quantity: number }>;
  }, finalVitals?: { health: number; magicka: number; stamina: number }) => void;
  onNarrativeUpdate?: (narrative: string) => void;
  onInventoryUpdate?: (removedItems: Array<{ name: string; quantity: number }>) => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

// Health bar component
const HealthBar: React.FC<{
  current: number;
  max: number;
  label: string;
  color: string;
  showNumbers?: boolean;
  isHealing?: boolean;
}> = ({ current, max, label, color, showNumbers = true, isHealing = false }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-amber-200/80">{label}</span>
        {showNumbers && <span className="text-amber-200/60">{current}/{max}</span>}
      </div>
      <div className="h-3 bg-stone-900/80 rounded-full overflow-hidden border border-stone-700">
        <div 
          className={`h-full transition-all duration-500 ${isHealing ? 'bg-green-400 animate-pulse' : color}`}
          style={{ width: `${percentage}%` }}
        />
        {isHealing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-green-300 text-lg animate-bounce">✨</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Enemy card component
const EnemyCard: React.FC<{
  enemy: CombatEnemy;
  isTarget: boolean;
  onClick: () => void;
  containerRef?: (el: HTMLDivElement | null) => void;
}> = ({ enemy, isTarget, onClick, containerRef }) => {
  const healthPercent = (enemy.currentHealth / enemy.maxHealth) * 100;
  const isDead = enemy.currentHealth <= 0;
  
  return (
    <div 
      ref={containerRef}
      onClick={isDead ? undefined : onClick}
      className={`
        relative p-3 rounded-lg border-2 transition-all duration-300
        ${isDead 
          ? 'bg-stone-900/50 border-stone-700 opacity-50 cursor-not-allowed' 
          : isTarget 
            ? 'bg-red-900/40 border-red-500 cursor-pointer ring-2 ring-red-400/50' 
            : 'bg-stone-800/60 border-stone-600 cursor-pointer hover:border-amber-500/50'
        }
      `}
    >
      {/* Boss indicator */}
      {enemy.isBoss && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-600 rounded text-xs font-bold">
          BOSS
        </div>
      )}
      
      {/* Enemy name and type */}
      <div className="mb-2">
        <h4 className={`font-bold ${isDead ? 'text-stone-500 line-through' : 'text-amber-100'}`}>
          {enemy.name}
        </h4>
        <span className="text-xs text-stone-400 capitalize">{enemy.type} • Lv.{enemy.level}</span>
      </div>
      
      {/* Health bar */}
      <div className="mb-2">
        <div className="h-2 bg-stone-900 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              healthPercent > 50 ? 'bg-green-500' : healthPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <div className="text-xs text-stone-400 mt-1 text-right">
          {enemy.currentHealth}/{enemy.maxHealth} HP
        </div>
      </div>
      
      {/* Status effects */}
      {enemy.activeEffects && enemy.activeEffects.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {enemy.activeEffects.map((ae, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-purple-900/60 rounded text-xs text-purple-300">
              {ae.effect.type} ({ae.turnsRemaining})
            </span>
          ))}
        </div>
      )}
      
      {/* Death overlay */}
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">💀</span>
        </div>
      )}
    </div>
  );
};

// Action button component
const ActionButton: React.FC<{
  ability: CombatAbility;
  disabled: boolean;
  cooldown: number;
  canAfford: boolean;
  onClick: () => void;
}> = ({ ability, disabled, cooldown, canAfford, onClick }) => {
  const getTypeIcon = () => {
    switch (ability.type) {
      case 'melee': return '⚔️';
      case 'ranged': return '🏹';
      case 'magic': return '✨';
      case 'shout': return '📢';
      default: return '⚡';
    }
  };
  
  const isDisabled = disabled || cooldown > 0 || !canAfford;
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative p-3 rounded-lg border-2 text-left transition-all
        ${isDisabled 
          ? 'bg-stone-800/30 border-stone-700 text-stone-500 cursor-not-allowed' 
          : 'bg-gradient-to-br from-amber-900/40 to-stone-900/60 border-amber-700/50 hover:border-amber-500 hover:from-amber-900/60'
        }
      `}
    >
      {/* Cooldown overlay */}
      {cooldown > 0 && (
        <div className="absolute inset-0 bg-stone-900/80 rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold text-amber-500">{cooldown}</span>
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{getTypeIcon()}</span>
        <span className={`font-bold ${isDisabled ? 'text-stone-500' : 'text-amber-100'}`}>
          {ability.name}
        </span>
      </div>
      
      <div className="flex gap-3 text-xs">
        {ability.damage > 0 && (
          <span className="text-red-400">⚔ {ability.damage}</span>
        )}
        <span className={`${ability.type === 'magic' ? 'text-blue-400' : 'text-green-400'}`}>
          {ability.type === 'magic' ? '💧' : '⚡'} {ability.cost}
        </span>
      </div>
      
      {!canAfford && !cooldown && (
        <span className="text-xs text-red-400 mt-1 block">Not enough {ability.type === 'magic' ? 'magicka' : 'stamina'}</span>
      )}
    </button>
  );
};

// Main combat modal
export const CombatModal: React.FC<CombatModalProps> = ({
  character,
  inventory,
  initialCombatState,
  onCombatEnd,
  onNarrativeUpdate,
  onInventoryUpdate,
  showToast
}) => {
  const [combatState, setCombatState] = useState<CombatState>(initialCombatState);
  const [playerStats, setPlayerStats] = useState<PlayerCombatStats>(() => 
    calculatePlayerCombatStats(character, inventory)
  );
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRoll, setShowRoll] = useState(false);
  const [rollValue, setRollValue] = useState<number | null>(null);
  const [floatingHits, setFloatingHits] = useState<Array<{ id: string; actor: string; damage: number; hitLocation?: string; isCrit?: boolean; x?: number; y?: number }>>([]);
  const enemyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [showItemSelection, setShowItemSelection] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-select first alive enemy
  useEffect(() => {
    if (!selectedTarget) {
      const firstAlive = combatState.enemies.find(e => e.currentHealth > 0);
      if (firstAlive) setSelectedTarget(firstAlive.id);
    }
  }, [combatState.enemies, selectedTarget]);

  // Scroll combat log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [combatState.combatLog]);

  // Handle combat end
  useEffect(() => {
    if (combatState.result) {
      setIsAnimating(true);
      setTimeout(() => {
        if (combatState.result === 'victory') {
          setShowVictory(true);
        } else if (combatState.result === 'defeat') {
          setShowDefeat(true);
        } else {
          // Fled or surrendered - end immediately
          onCombatEnd(combatState.result, undefined, {
            health: playerStats.currentHealth,
            magicka: playerStats.currentMagicka,
            stamina: playerStats.currentStamina
          });
        }
        setIsAnimating(false);
      }, 1500);
    }
  }, [combatState.result]);

  // Process enemy turns
  const processEnemyTurns = useCallback(async () => {
    let currentState = combatState;
    let currentPlayerStats = playerStats;
    
    while (currentState.active && currentState.currentTurnActor !== 'player') {
      setIsAnimating(true);
      
      // Execute enemy turn
      const { newState, newPlayerStats, narrative } = executeEnemyTurn(
        currentState,
        currentState.currentTurnActor,
        currentPlayerStats
      );
      
      currentState = newState;
      currentPlayerStats = newPlayerStats;
      
      // Update state with animation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCombatState(currentState);
      setPlayerStats(currentPlayerStats);
      
      if (onNarrativeUpdate && narrative) {
        onNarrativeUpdate(narrative);
      }

      // Show floating damage for enemy action if present
      const last = newState.combatLog[newState.combatLog.length - 1];
      if (last && last.actor !== 'player' && last.damage && last.damage > 0) {
        const id = `hit_e_${Date.now()}`;
        // Anchor to the player stats panel
        let x: number | undefined;
        let y: number | undefined;
        try {
          const el = playerRef.current;
          if (el) {
            const r = el.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
          }
        } catch (e) {}

        setFloatingHits(h => [{ id, actor: last.actor, damage: last.damage, hitLocation: undefined, isCrit: (last.narrative || '').toLowerCase().includes('critical'), x, y }, ...h]);
        setTimeout(() => setFloatingHits(h => h.filter(x => x.id !== id)), 1600);

        try { new Audio('/audio/sfx/hit_player.mp3').play().catch(()=>{}); } catch (e) {}
      }
      
      // Check for combat end
      currentState = checkCombatEnd(currentState, currentPlayerStats);
      if (!currentState.active) {
        setCombatState(currentState);
        break;
      }
      
      // Advance to next turn
      currentState = advanceTurn(currentState);
      setCombatState(currentState);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsAnimating(false);
  }, [combatState, playerStats, onNarrativeUpdate]);

  // Trigger enemy turns when it's not player's turn
  useEffect(() => {
    if (combatState.active && combatState.currentTurnActor !== 'player' && !isAnimating) {
      processEnemyTurns();
    }
  }, [combatState.currentTurnActor, combatState.active, isAnimating]);

  // Handle player action
  const handlePlayerAction = async (action: CombatActionType, abilityId?: string, itemId?: string) => {
    if (isAnimating || combatState.currentTurnActor !== 'player') return;

    setIsAnimating(true);

    // Show d20 roll animation (visual only) before resolving
    const roll = Math.floor(Math.random() * 20) + 1;
    setRollValue(roll);
    setShowRoll(true);
    await new Promise(r => setTimeout(r, 600));
    setShowRoll(false);

    const { newState, newPlayerStats, narrative, usedItem } = executePlayerAction(
      combatState,
      playerStats,
      action,
      selectedTarget || undefined,
      abilityId,
      itemId,
      inventory
    );

    if (onNarrativeUpdate && narrative) {
      onNarrativeUpdate(narrative);
    }
    
    // Trigger healing animation and toast if health was restored
    if (action === 'item' && newPlayerStats.currentHealth > playerStats.currentHealth) {
      setIsHealing(true);
      setTimeout(() => setIsHealing(false), 1000);
      if (showToast) {
        showToast(`Restored ${newPlayerStats.currentHealth - playerStats.currentHealth} health!`, 'success');
      }
    }
    
    // Update inventory if item was used
    if (usedItem) {
      if (onInventoryUpdate) {
        onInventoryUpdate([{ name: usedItem.name, quantity: 1 }]);
      }
      if (showToast) {
        showToast(`Used ${usedItem.name}`, 'info');
      }
    }
    
    // Check combat end
    let finalState = checkCombatEnd(newState, newPlayerStats);
    
    if (finalState.active && (action !== 'flee' || !narrative.includes('failed'))) {
      finalState = advanceTurn(finalState);
    }
    
    setCombatState(finalState);
    setPlayerStats(newPlayerStats);
    // Show floating damage based on last combat log entry (if any)
    const last = finalState.combatLog[finalState.combatLog.length - 1];
    if (last && last.actor === 'player' && last.damage && last.damage > 0) {
      const id = `hit_p_${Date.now()}`;
      // Try to anchor to selected target element
      let x: number | undefined;
      let y: number | undefined;
      try {
        const targetEnemy = combatState.enemies.find(e => e.id === selectedTarget);
        if (targetEnemy) {
          const el = enemyRefs.current[targetEnemy.id];
          if (el) {
            const r = el.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
          }
        }
      } catch (e) { /* ignore */ }

      setFloatingHits(h => [{ id, actor: 'player', damage: last.damage, hitLocation: undefined, isCrit: (last.narrative || '').toLowerCase().includes('critical'), x, y }, ...h]);
      setTimeout(() => setFloatingHits(h => h.filter(x => x.id !== id)), 1600);

      // Play hit sound if available
      try { new Audio('/audio/sfx/hit.mp3').play().catch(()=>{}); } catch (e) {}
    }
    
    setTimeout(() => setIsAnimating(false), 500);
  };

  // Close victory screen and end combat
  const handleVictoryClose = () => {
    onCombatEnd('victory', combatState.rewards, {
      health: playerStats.currentHealth,
      magicka: playerStats.currentMagicka,
      stamina: playerStats.currentStamina
    });
  };

  // Close defeat screen
  const handleDefeatClose = () => {
    onCombatEnd('defeat', undefined, {
      health: 0,
      magicka: playerStats.currentMagicka,
      stamina: playerStats.currentStamina
    });
  };

  const isPlayerTurn = combatState.currentTurnActor === 'player' && combatState.active;

  // Get usable items for combat (potions and food)
  const getUsableItems = () => {
    return inventory.filter(item => 
      item.quantity > 0 && (
        item.type === 'potion' ||
        item.type === 'food' ||
        item.type === 'drink'
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Combat header */}
      <div className="bg-gradient-to-b from-stone-900 to-transparent p-4 border-b border-amber-900/30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-amber-100 tracking-wider">⚔️ COMBAT</h2>
            <p className="text-sm text-stone-400">{combatState.location} • Turn {combatState.turn}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${isPlayerTurn ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
            {isPlayerTurn ? '🎯 Your Turn' : '⏳ Enemy Turn'}
          </div>
        </div>
      </div>

      {/* Main combat area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left side - Player stats */}
        <div className="lg:w-1/4 space-y-4">
          <div ref={playerRef} className="bg-stone-900/60 rounded-lg p-4 border border-amber-900/30">
            <h3 className="text-lg font-bold text-amber-100 mb-3">{getEasterEggName(character.name)}</h3>
            <div className="space-y-3">
              <HealthBar 
                current={playerStats.currentHealth} 
                max={playerStats.maxHealth} 
                label="Health" 
                color="bg-gradient-to-r from-red-600 to-red-500"
                isHealing={isHealing}
              />
              <HealthBar 
                current={playerStats.currentMagicka} 
                max={playerStats.maxMagicka} 
                label="Magicka" 
                color="bg-gradient-to-r from-blue-600 to-blue-500" 
              />
              <HealthBar 
                current={playerStats.currentStamina} 
                max={playerStats.maxStamina} 
                label="Stamina" 
                color="bg-gradient-to-r from-green-600 to-green-500" 
              />
            </div>
            
            <div className="mt-4 pt-3 border-t border-stone-700 grid grid-cols-2 gap-2 text-xs">
              <div className="text-stone-400">⚔ Damage: <span className="text-amber-200">{playerStats.weaponDamage}</span></div>
              <div className="text-stone-400">🛡 Armor: <span className="text-amber-200">{playerStats.armor}</span></div>
              <div className="text-stone-400">💫 Crit: <span className="text-amber-200">{playerStats.critChance}%</span></div>
              <div className="text-stone-400">💨 Dodge: <span className="text-amber-200">{playerStats.dodgeChance}%</span></div>
            </div>
            
            {/* Player status effects */}
            {playerStats.currentHealth < playerStats.maxHealth * 0.3 && (
              <div className="mt-3 px-2 py-1 bg-red-900/40 rounded text-xs text-red-300">
                ⚠️ Critical Health!
              </div>
            )}
            {combatState.playerDefending && (
              <div className="mt-2 px-2 py-1 bg-blue-900/40 rounded text-xs text-blue-300">
                🛡️ Defending (50% damage reduction)
              </div>
            )}
          </div>
        </div>

        {/* Center - Enemies and combat log */}
        <div className="lg:w-1/2 flex flex-col gap-4">
          {/* Enemies */}
          <div className="bg-stone-900/40 rounded-lg p-4 border border-stone-700">
            <h3 className="text-sm font-bold text-stone-400 mb-3">ENEMIES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {combatState.enemies.map(enemy => (
                <EnemyCard
                  key={enemy.id}
                  enemy={enemy}
                  isTarget={selectedTarget === enemy.id}
                  onClick={() => setSelectedTarget(enemy.id)}
                  containerRef={(el) => { enemyRefs.current[enemy.id] = el; }}
                />
              ))}
            </div>
          </div>

          {/* Combat log */}
          <div className="flex-1 bg-stone-900/40 rounded-lg border border-stone-700 flex flex-col min-h-[200px]">
            <h3 className="text-sm font-bold text-stone-400 p-3 border-b border-stone-700">COMBAT LOG</h3>
            <div ref={logRef} className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
              {combatState.combatLog.map((entry, i) => (
                <div 
                  key={i} 
                  className={`text-sm p-2 rounded ${
                    entry.actor === 'player' 
                      ? 'bg-green-900/20 border-l-2 border-green-500' 
                      : entry.actor === 'system'
                        ? 'bg-amber-900/20 border-l-2 border-amber-500'
                        : 'bg-red-900/20 border-l-2 border-red-500'
                  }`}
                >
                  <span className="text-xs text-stone-500 mr-2">T{entry.turn}</span>
                  <span className="text-stone-300">{entry.narrative}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="lg:w-1/4 space-y-4">
          {/* Abilities */}
          <div className="bg-stone-900/60 rounded-lg p-4 border border-amber-900/30">
            <h3 className="text-sm font-bold text-stone-400 mb-3">ABILITIES</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {playerStats.abilities.map(ability => (
                <ActionButton
                  key={ability.id}
                  ability={ability}
                  disabled={!isPlayerTurn || isAnimating}
                  cooldown={combatState.abilityCooldowns[ability.id] || 0}
                  canAfford={
                    ability.type === 'magic' 
                      ? playerStats.currentMagicka >= ability.cost
                      : playerStats.currentStamina >= ability.cost
                  }
                  onClick={() => handlePlayerAction('attack', ability.id)}
                />
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="bg-stone-900/60 rounded-lg p-4 border border-green-900/30">
            <h3 className="text-sm font-bold text-stone-400 mb-3">ITEMS</h3>
            <div className="space-y-2">
              {getUsableItems().length > 0 ? (
                <>
                  {!showItemSelection ? (
                    <button
                      onClick={() => setShowItemSelection(true)}
                      disabled={!isPlayerTurn || isAnimating}
                      className="w-full p-2 rounded bg-green-900/40 border border-green-700/50 text-green-200 hover:bg-green-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🧪 Use Item ({getUsableItems().length})
                    </button>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => setShowItemSelection(false)}
                        className="w-full p-1 text-xs rounded bg-stone-700/40 border border-stone-600 text-stone-300 hover:bg-stone-700/60"
                      >
                        ← Back
                      </button>
                      {getUsableItems().map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            handlePlayerAction('item', undefined, item.id);
                            setShowItemSelection(false);
                          }}
                          disabled={!isPlayerTurn || isAnimating}
                          className="w-full p-2 rounded bg-green-900/40 border border-green-700/50 text-green-200 hover:bg-green-900/60 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          <div className="flex justify-between items-center">
                            <span>{item.name}</span>
                            <span className="text-xs text-stone-400">x{item.quantity}</span>
                          </div>
                          <div className="text-xs text-stone-400 mt-1">
                            {item.type === 'potion' ? '💊 Health Potion' : 
                             item.type === 'food' ? '🍖 Food' : '🥤 Drink'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-stone-500 text-center py-2">
                  No usable items
                </div>
              )}
            </div>
          </div>

          {/* Other actions */}
          <div className="bg-stone-900/60 rounded-lg p-4 border border-stone-700">
            <h3 className="text-sm font-bold text-stone-400 mb-3">ACTIONS</h3>
            <div className="space-y-2">
              <button
                onClick={() => handlePlayerAction('defend')}
                disabled={!isPlayerTurn || isAnimating}
                className="w-full p-2 rounded bg-blue-900/40 border border-blue-700/50 text-blue-200 hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🛡️ Defend
              </button>
              
              {combatState.fleeAllowed && (
                <button
                  onClick={() => handlePlayerAction('flee')}
                  disabled={!isPlayerTurn || isAnimating}
                  className="w-full p-2 rounded bg-yellow-900/40 border border-yellow-700/50 text-yellow-200 hover:bg-yellow-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🏃 Flee
                </button>
              )}
              
              {combatState.surrenderAllowed && (
                <button
                  onClick={() => handlePlayerAction('surrender')}
                  disabled={!isPlayerTurn || isAnimating}
                  className="w-full p-2 rounded bg-stone-700/40 border border-stone-600 text-stone-300 hover:bg-stone-700/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🏳️ Surrender
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Victory overlay */}
      {showVictory && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-60">
          <div className="bg-gradient-to-b from-amber-900/90 to-stone-900/95 rounded-xl p-8 max-w-md text-center border-2 border-amber-500 shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-amber-100 mb-2">VICTORY!</h2>
            <p className="text-stone-300 mb-6">You have defeated all enemies!</p>
            
            {combatState.rewards && (
              <div className="bg-stone-900/60 rounded-lg p-4 mb-6 text-left">
                <h3 className="text-amber-200 font-bold mb-2">Rewards:</h3>
                <div className="space-y-1 text-sm">
                  <div className="text-green-400">✨ {combatState.rewards.xp} XP</div>
                  {combatState.rewards.gold > 0 && (
                    <div className="text-yellow-400">💰 {combatState.rewards.gold} Gold</div>
                  )}
                  {combatState.rewards.items.map((item, i) => (
                    <div key={i} className="text-blue-300">📦 {item.name} x{item.quantity}</div>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={handleVictoryClose}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* D20 roll visual */}
      {showRoll && (
        <div className="absolute left-1/2 top-20 transform -translate-x-1/2 z-50 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/80 border-2 border-amber-500 flex items-center justify-center text-2xl text-amber-200 animate-bounce">
            {rollValue}
          </div>
        </div>
      )}

      {/* Floating damage / hit indicators */}
      {floatingHits.map((hit) => (
        <div
          key={hit.id}
          className="absolute z-50 pointer-events-none"
          style={{
            left: hit.x ? `${hit.x}px` : '50%',
            top: hit.y ? `${hit.y}px` : '120px',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${hit.actor === 'player' ? 'bg-green-900/60 text-green-200 border border-green-400' : 'bg-red-900/60 text-red-200 border border-red-400'} transition-transform duration-300`}>
            {hit.isCrit ? '💥 ' : ''}-{hit.damage} {hit.hitLocation ? `(${hit.hitLocation})` : ''}
          </div>
        </div>
      ))}

      {/* Defeat overlay */}
      {showDefeat && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-60">
          <div className="bg-gradient-to-b from-red-900/90 to-stone-900/95 rounded-xl p-8 max-w-md text-center border-2 border-red-500 shadow-2xl">
            <div className="text-6xl mb-4">💀</div>
            <h2 className="text-3xl font-bold text-red-100 mb-2">DEFEATED</h2>
            <p className="text-stone-300 mb-6">You have fallen in battle...</p>
            
            <button
              onClick={handleDefeatClose}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
            >
              Accept Fate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombatModal;
