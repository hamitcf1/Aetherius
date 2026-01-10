import React, { useMemo } from 'react';
import { InventoryItem, EquipmentSlot } from '../types';
import { Sword, Shield, Crown, Shirt, Hand, Footprints, CircleDot, Gem, X, Swords } from 'lucide-react';

interface EquipmentHUDProps {
  items: InventoryItem[];
  onUnequip: (item: InventoryItem) => void;
  onEquipFromSlot: (slot: EquipmentSlot) => void;
}

interface SlotConfig {
  slot: EquipmentSlot;
  label: string;
  icon: React.ReactNode;
  position: string;
  allowedTypes: InventoryItem['type'][];
}

const SLOT_CONFIGS: SlotConfig[] = [
  { slot: 'head', label: 'Head', icon: <Crown size={20} />, position: 'top-0 left-1/2 -translate-x-1/2', allowedTypes: ['apparel'] },
  { slot: 'necklace', label: 'Necklace', icon: <CircleDot size={18} />, position: 'top-16 left-1/2 -translate-x-1/2', allowedTypes: ['apparel'] },
  { slot: 'chest', label: 'Chest', icon: <Shirt size={20} />, position: 'top-28 left-1/2 -translate-x-1/2', allowedTypes: ['apparel'] },
  { slot: 'hands', label: 'Hands', icon: <Hand size={18} />, position: 'top-28 left-2', allowedTypes: ['apparel'] },
  { slot: 'weapon', label: 'Weapon', icon: <Sword size={20} />, position: 'top-44 left-0', allowedTypes: ['weapon'] },
  { slot: 'offhand', label: 'Off-hand', icon: <Shield size={20} />, position: 'top-44 right-0', allowedTypes: ['weapon', 'apparel'] },
  { slot: 'ring', label: 'Ring', icon: <Gem size={16} />, position: 'top-28 right-2', allowedTypes: ['apparel'] },
  { slot: 'feet', label: 'Feet', icon: <Footprints size={18} />, position: 'bottom-0 left-1/2 -translate-x-1/2', allowedTypes: ['apparel'] },
];

// Keywords for ring and necklace items
const RING_KEYWORDS = ['ring', 'band', 'signet'];
const NECKLACE_KEYWORDS = ['necklace', 'amulet', 'pendant', 'torc', 'chain'];

export const EquipmentHUD: React.FC<EquipmentHUDProps> = ({ items, onUnequip, onEquipFromSlot }) => {
  // Get equipped items by slot
  const equippedBySlot = useMemo(() => {
    const map: Record<EquipmentSlot, InventoryItem | null> = {
      head: null,
      chest: null,
      hands: null,
      feet: null,
      weapon: null,
      offhand: null,
      ring: null,
      necklace: null,
    };
    
    items.filter(i => i.equipped && i.slot).forEach(item => {
      if (item.slot) {
        map[item.slot] = item;
      }
    });
    
    return map;
  }, [items]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    let armor = 0;
    let damage = 0;
    
    items.filter(i => i.equipped).forEach(item => {
      armor += item.armor || 0;
      damage += item.damage || 0;
    });
    
    return { armor, damage };
  }, [items]);

  return (
    <div className="bg-gradient-to-b from-black/60 to-black/40 border border-skyrim-border rounded-lg p-4">
      {/* Stats Summary */}
      <div className="flex justify-center gap-6 mb-4 pb-3 border-b border-skyrim-border/50">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-blue-400" />
          <span className="text-sm text-gray-300">Armor:</span>
          <span className="text-lg font-bold text-blue-400">{totalStats.armor}</span>
        </div>
        <div className="flex items-center gap-2">
          <Swords size={18} className="text-red-400" />
          <span className="text-sm text-gray-300">Damage:</span>
          <span className="text-lg font-bold text-red-400">{totalStats.damage}</span>
        </div>
      </div>

      {/* Body Silhouette with Equipment Slots */}
      <div className="relative w-full max-w-[280px] mx-auto h-[320px]">
        {/* Body Silhouette SVG */}
        <svg 
          viewBox="0 0 100 150" 
          className="absolute inset-0 w-full h-full opacity-20"
          fill="currentColor"
        >
          {/* Head */}
          <circle cx="50" cy="15" r="12" className="text-skyrim-gold" />
          {/* Neck */}
          <rect x="46" y="27" width="8" height="8" className="text-skyrim-gold" />
          {/* Torso */}
          <path d="M30 35 L70 35 L75 80 L25 80 Z" className="text-skyrim-gold" />
          {/* Left Arm */}
          <path d="M30 35 L20 38 L15 70 L22 72 L28 45 L30 45" className="text-skyrim-gold" />
          {/* Right Arm */}
          <path d="M70 35 L80 38 L85 70 L78 72 L72 45 L70 45" className="text-skyrim-gold" />
          {/* Left Leg */}
          <path d="M35 80 L30 130 L38 132 L45 85 L45 80" className="text-skyrim-gold" />
          {/* Right Leg */}
          <path d="M65 80 L70 130 L62 132 L55 85 L55 80" className="text-skyrim-gold" />
          {/* Feet */}
          <ellipse cx="34" cy="138" rx="8" ry="5" className="text-skyrim-gold" />
          <ellipse cx="66" cy="138" rx="8" ry="5" className="text-skyrim-gold" />
        </svg>

        {/* Equipment Slots */}
        {SLOT_CONFIGS.map(config => {
          const equipped = equippedBySlot[config.slot];
          
          return (
            <div
              key={config.slot}
              className={`absolute ${config.position} z-10`}
            >
              <div
                onClick={() => equipped ? onUnequip(equipped) : onEquipFromSlot(config.slot)}
                className={`
                  w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer
                  transition-all duration-200 group relative
                  ${equipped 
                    ? 'bg-skyrim-gold/20 border-skyrim-gold shadow-[0_0_10px_rgba(192,160,98,0.3)]' 
                    : 'bg-black/50 border-skyrim-border/50 hover:border-skyrim-gold/50 hover:bg-black/70'
                  }
                `}
                title={equipped ? `${equipped.name} (Click to unequip)` : `Equip ${config.label}`}
              >
                {equipped ? (
                  <>
                    <div className="text-skyrim-gold">{config.icon}</div>
                    <span className="text-[8px] text-skyrim-gold mt-0.5 truncate w-full text-center px-1">
                      {equipped.name.length > 8 ? equipped.name.substring(0, 7) + '…' : equipped.name}
                    </span>
                    {/* Unequip indicator on hover */}
                    <div className="absolute inset-0 bg-red-900/80 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <X size={20} className="text-red-300" />
                    </div>
                    {/* Stats tooltip */}
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-black/95 border border-skyrim-gold/50 rounded px-2 py-1 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                      <div className="text-skyrim-gold font-bold">{equipped.name}</div>
                      {equipped.armor && <div className="text-blue-400">Armor: {equipped.armor}</div>}
                      {equipped.damage && <div className="text-red-400">Damage: {equipped.damage}</div>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-600 group-hover:text-gray-400">{config.icon}</div>
                    <span className="text-[9px] text-gray-600 group-hover:text-gray-400 mt-0.5">{config.label}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-skyrim-border/50 text-center">
        <p className="text-[10px] text-gray-500">Click empty slot to equip • Click equipped item to unequip</p>
      </div>
    </div>
  );
};

// Helper function to determine slot from item
export const getDefaultSlotForItem = (item: InventoryItem): EquipmentSlot | null => {
  if (item.slot) return item.slot;
  
  const nameLower = item.name.toLowerCase();
  
  // Only weapons and apparel can be equipped
  if (item.type !== 'weapon' && item.type !== 'apparel') {
    return null;
  }
  
  if (item.type === 'weapon') {
    if (nameLower.includes('shield') || nameLower.includes('torch')) return 'offhand';
    return 'weapon';
  }
  
  if (item.type === 'apparel') {
    if (nameLower.includes('helmet') || nameLower.includes('hood') || nameLower.includes('circlet') || nameLower.includes('crown')) return 'head';
    // Check for ring keywords
    if (RING_KEYWORDS.some(k => nameLower.includes(k))) return 'ring';
    // Check for necklace keywords
    if (NECKLACE_KEYWORDS.some(k => nameLower.includes(k))) return 'necklace';
    if (nameLower.includes('gauntlet') || nameLower.includes('glove') || nameLower.includes('bracer')) return 'hands';
    if (nameLower.includes('boot') || nameLower.includes('shoe') || nameLower.includes('greave')) return 'feet';
    if (nameLower.includes('armor') || nameLower.includes('cuirass') || nameLower.includes('robe') || nameLower.includes('clothes') || nameLower.includes('tunic')) return 'chest';
    // Default apparel to chest
    return 'chest';
  }
  
  return null;
};

export const SLOT_CONFIGS_EXPORT = SLOT_CONFIGS;
