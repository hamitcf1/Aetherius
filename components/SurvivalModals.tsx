import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Moon, Apple, Droplets, Tent, Home, TreePine, Clock, Coins } from 'lucide-react';
import { InventoryItem } from '../types';

// Hook for modal keyboard and click-outside handling
function useModalClose(open: boolean, onClose: () => void) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, handleKeyDown]);
}

// === REST MODAL ===
export interface RestOptions {
  type: 'outside' | 'camp' | 'inn';
  hours: number;
  innCost?: number;
}

interface RestModalProps {
  open: boolean;
  onClose: () => void;
  onRest: (options: RestOptions) => void;
  gold: number;
  hasCampingGear: boolean;
  hasBedroll: boolean;
}

const INN_COST = 10;

export function RestModal({ open, onClose, onRest, gold, hasCampingGear, hasBedroll }: RestModalProps) {
  const [restType, setRestType] = useState<'outside' | 'camp' | 'inn'>('outside');
  const [hours, setHours] = useState(8);

  useModalClose(open, onClose);

  const restQuality = useMemo(() => {
    if (restType === 'inn') return { label: 'Well Rested', fatigueReduction: 50, desc: 'A warm bed at the inn. Full rest.' };
    if (restType === 'camp') {
      if (hasCampingGear) return { label: 'Rested', fatigueReduction: 40, desc: 'Your tent provides good shelter.' };
      if (hasBedroll) return { label: 'Somewhat Rested', fatigueReduction: 30, desc: 'Bedroll offers basic comfort.' };
    }
    return { label: 'Poorly Rested', fatigueReduction: 15, desc: 'Sleeping on the ground. Uncomfortable.' };
  }, [restType, hasCampingGear, hasBedroll]);

  const canAffordInn = gold >= INN_COST;

  const handleRest = () => {
    onRest({
      type: restType,
      hours,
      innCost: restType === 'inn' ? INN_COST : undefined
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-skyrim-border flex items-center justify-between bg-skyrim-dark/50">
          <div className="flex items-center gap-3">
            <Moon className="text-skyrim-gold" size={20} />
            <h2 className="text-lg font-serif text-skyrim-gold">Rest</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/40 rounded">
            <X size={18} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Rest Type Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Where to rest</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setRestType('outside')}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-colors ${
                  restType === 'outside'
                    ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold'
                    : 'bg-black/30 border-skyrim-border text-gray-400 hover:border-gray-500'
                }`}
              >
                <TreePine size={20} />
                <span className="text-xs">Outside</span>
              </button>
              <button
                onClick={() => setRestType('camp')}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-colors ${
                  restType === 'camp'
                    ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold'
                    : 'bg-black/30 border-skyrim-border text-gray-400 hover:border-gray-500'
                }`}
              >
                <Tent size={20} />
                <span className="text-xs">Camp</span>
                {!hasBedroll && !hasCampingGear && (
                  <span className="text-[10px] text-red-400">No gear</span>
                )}
              </button>
              <button
                onClick={() => setRestType('inn')}
                disabled={!canAffordInn}
                className={`p-3 rounded border flex flex-col items-center gap-2 transition-colors ${
                  restType === 'inn'
                    ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold'
                    : canAffordInn
                    ? 'bg-black/30 border-skyrim-border text-gray-400 hover:border-gray-500'
                    : 'bg-black/20 border-red-900/30 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Home size={20} />
                <span className="text-xs">Inn</span>
                <span className="text-[10px] flex items-center gap-1">
                  <Coins size={10} />{INN_COST}g
                </span>
              </button>
            </div>
          </div>

          {/* Rest Quality Info */}
          <div className="p-3 bg-black/30 border border-skyrim-border/60 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{restQuality.label}</span>
              <span className="text-xs text-green-400">-{restQuality.fatigueReduction} fatigue</span>
            </div>
            <p className="text-xs text-gray-500">{restQuality.desc}</p>
          </div>

          {/* Hours Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-gray-400 font-bold">Duration</label>
              <span className="text-sm text-gray-300 flex items-center gap-1">
                <Clock size={14} /> {hours} hours
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1h</span>
              <span>6h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleRest}
            className="w-full py-3 bg-skyrim-gold text-skyrim-dark rounded font-bold hover:bg-yellow-400 transition-colors"
          >
            Rest for {hours} hours
          </button>
        </div>
      </div>
    </div>
  );
}

// === EAT MODAL ===
interface EatModalProps {
  open: boolean;
  onClose: () => void;
  onEat: (item: InventoryItem) => void;
  foodItems: InventoryItem[];
}

const FOOD_KEYWORDS = ['bread', 'apple', 'cheese', 'meat', 'stew', 'soup', 'potato', 'carrot', 'salmon', 'leek', 'cabbage', 'sweetroll', 'pie', 'ration', 'food', 'meal', 'venison', 'rabbit', 'horker', 'mammoth', 'beef', 'haunch'];

export function EatModal({ open, onClose, onEat, foodItems }: EatModalProps) {
  useModalClose(open, onClose);

  const availableFood = useMemo(() => {
    return foodItems.filter(item => {
      if ((item.quantity || 0) <= 0) return false;
      const name = (item.name || '').toLowerCase();
      // Match food keywords or 'food' type
      return FOOD_KEYWORDS.some(k => name.includes(k)) || item.type === 'ingredient';
    });
  }, [foodItems]);

  const handleEat = (item: InventoryItem) => {
    onEat(item);
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-skyrim-border flex items-center justify-between bg-skyrim-dark/50">
          <div className="flex items-center gap-3">
            <Apple className="text-skyrim-gold" size={20} />
            <h2 className="text-lg font-serif text-skyrim-gold">Eat</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/40 rounded">
            <X size={18} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-4">
          {availableFood.length === 0 ? (
            <div className="text-center py-8">
              <Apple size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No food in your inventory.</p>
              <p className="text-xs text-gray-500 mt-1">Visit the shop to buy supplies.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableFood.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleEat(item)}
                  className="w-full p-3 bg-black/30 border border-skyrim-border/60 rounded hover:border-skyrim-gold/50 transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <div className="text-gray-200 font-semibold text-sm">{item.name}</div>
                    <div className="text-gray-500 text-xs">x{item.quantity}</div>
                  </div>
                  <span className="text-green-400 text-xs">-25 hunger</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === DRINK MODAL ===
interface DrinkModalProps {
  open: boolean;
  onClose: () => void;
  onDrink: (item: InventoryItem) => void;
  drinkItems: InventoryItem[];
}

const DRINK_KEYWORDS = ['water', 'ale', 'mead', 'wine', 'milk', 'drink', 'juice', 'tea', 'skooma', 'skin'];

export function DrinkModal({ open, onClose, onDrink, drinkItems }: DrinkModalProps) {
  useModalClose(open, onClose);

  const availableDrinks = useMemo(() => {
    return drinkItems.filter(item => {
      if ((item.quantity || 0) <= 0) return false;
      const name = (item.name || '').toLowerCase();
      // Exclude health/magicka/stamina potions
      if (name.includes('potion') && (name.includes('health') || name.includes('magicka') || name.includes('stamina'))) {
        return false;
      }
      return DRINK_KEYWORDS.some(k => name.includes(k));
    });
  }, [drinkItems]);

  const handleDrink = (item: InventoryItem) => {
    onDrink(item);
    onClose();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-skyrim-border flex items-center justify-between bg-skyrim-dark/50">
          <div className="flex items-center gap-3">
            <Droplets className="text-skyrim-gold" size={20} />
            <h2 className="text-lg font-serif text-skyrim-gold">Drink</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/40 rounded">
            <X size={18} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="p-4">
          {availableDrinks.length === 0 ? (
            <div className="text-center py-8">
              <Droplets size={32} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No drinks in your inventory.</p>
              <p className="text-xs text-gray-500 mt-1">Visit the shop to buy supplies.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableDrinks.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleDrink(item)}
                  className="w-full p-3 bg-black/30 border border-skyrim-border/60 rounded hover:border-skyrim-gold/50 transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <div className="text-gray-200 font-semibold text-sm">{item.name}</div>
                    <div className="text-gray-500 text-xs">x{item.quantity}</div>
                  </div>
                  <span className="text-blue-400 text-xs">-25 thirst</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
