import React, { useState, useMemo } from 'react';
import { InventoryItem, EquipmentSlot } from '../types';
import { Shield, Sword, FlaskConical, Gem, Key, Package, Trash2, Plus, Coins, Apple, Droplets, Tent, ArrowUpDown, User, Backpack, Check, ShoppingBag, Weight } from 'lucide-react';
import { EquipmentHUD, getDefaultSlotForItem, SLOT_CONFIGS_EXPORT } from './EquipmentHUD';
import { ShopModal } from './ShopModal';
import { useAppContext } from '../AppContext';
import { getItemStats, shouldHaveStats } from '../services/itemStats';
import { EncumbranceIndicator } from './StatusIndicators';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

// Default weights by item type
const getDefaultItemWeight = (type: string): number => {
  switch (type) {
    case 'weapon': return 8;
    case 'apparel': return 5;
    case 'potion': return 0.5;
    case 'ingredient': return 0.1;
    case 'food': return 0.5;
    case 'drink': return 0.5;
    case 'key': return 0;
    case 'misc': return 1;
    case 'camping': return 10;
    default: return 1;
  }
};

interface InventoryProps {
  items: InventoryItem[];
  setItems: (items: InventoryItem[]) => void;
  gold: number;
  setGold: (amount: number) => void;
  maxCarryWeight?: number;
}

const COMMON_ITEMS = [
    { name: "Iron Sword", type: "weapon", desc: "A standard Imperial issue sword." },
    { name: "Steel Dagger", type: "weapon", desc: "Sharp and lightweight." },
    { name: "Iron Helmet", type: "apparel", desc: "Basic protection." },
    { name: "Leather Armor", type: "apparel", desc: "Lightweight armor." },
    { name: "Health Potion (Minor)", type: "potion", desc: "Restores 25 points of Health." },
    { name: "Magicka Potion (Minor)", type: "potion", desc: "Restores 25 points of Magicka." },
    { name: "Lockpick", type: "misc", desc: "Used to open locks." },
    { name: "Torch", type: "misc", desc: "Provides light." },
    { name: "Sweetroll", type: "ingredient", desc: "A sticky treat." },
];

const InventoryItemCard: React.FC<{
    item: InventoryItem;
    onUpdate: (updated: InventoryItem) => void;
    onRemove: () => void;
    onDeltaQuantity: (delta: number) => void;
    onEquip?: (item: InventoryItem) => void;
    onUnequip?: (item: InventoryItem) => void;
    onUse?: (item: InventoryItem) => void;
    getIcon: (type: string) => React.ReactNode;
}> = ({ item, onUpdate, onRemove, onDeltaQuantity, onEquip, onUnequip, onUse, getIcon }) => {
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const [editDesc, setEditDesc] = useState(item.description);
    const [editQty, setEditQty] = useState(item.quantity);

    const startEdit = () => {
        setEditName(item.name);
        setEditDesc(item.description);
        setEditQty(item.quantity);
        setEditMode(true);
    };

    const handleSave = () => {
        const nextQty = Number.isFinite(editQty) ? Math.max(1, editQty) : 1;
        onUpdate({ ...item, name: editName, description: editDesc, quantity: nextQty });
        setEditMode(false);
    };

    const canEquip = item.type === 'weapon' || item.type === 'apparel';
    const canUse = ['food', 'drink', 'potion', 'ingredient'].includes(item.type);
    const isEquipped = item.equipped;

    return (
        <div className={`bg-skyrim-paper/60 border p-4 rounded flex items-center gap-4 transition-all ${
          isEquipped 
            ? 'border-skyrim-gold shadow-[0_0_10px_rgba(192,160,98,0.2)] bg-skyrim-gold/10' 
            : 'border-skyrim-border hover:border-skyrim-gold/50'
        }`}>
            <div className={`p-3 rounded-full border ${
              isEquipped 
                ? 'bg-skyrim-gold/30 text-skyrim-gold border-skyrim-gold' 
                : 'bg-black/40 text-skyrim-gold border-skyrim-border'
            }`}>
                {getIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
                {editMode ? (
                    <>
                        <input
                            className="w-full bg-black/40 border border-skyrim-border p-1 rounded text-skyrim-gold font-serif mb-1"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                        />
                        <input
                            className="w-20 bg-black/40 border border-skyrim-border p-1 rounded text-gray-200 mb-1"
                            type="number"
                            min={1}
                            value={editQty}
                            onChange={e => setEditQty(Number(e.target.value))}
                        />
                        <input
                            className="w-full bg-black/40 border border-skyrim-border p-1 rounded text-gray-200"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                        />
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleSave} className="px-2 py-1 bg-skyrim-gold text-skyrim-dark rounded text-xs">Save</button>
                            <button onClick={() => setEditMode(false)} className="px-2 py-1 bg-gray-600 text-white rounded text-xs">Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-skyrim-gold font-serif truncate">
                              {item.name}
                          </h3>
                          <span className="text-xs text-gray-500">x{item.quantity}</span>
                          {isEquipped && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-skyrim-gold/30 text-skyrim-gold rounded border border-skyrim-gold/50 flex items-center gap-1">
                              <Check size={10} /> Equipped
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{item.description}</p>
                        {/* Stats display - get from item or itemStats service */}
                        {(() => {
                          let displayArmor = item.armor;
                          let displayDamage = item.damage;
                          let displayValue = item.value;
                          
                          // If item doesn't have stats but should, get from itemStats
                          if ((displayArmor === undefined || displayDamage === undefined) && shouldHaveStats(item.type)) {
                            const stats = getItemStats(item.name, item.type);
                            if (displayArmor === undefined) displayArmor = stats.armor;
                            if (displayDamage === undefined) displayDamage = stats.damage;
                            if (displayValue === undefined) displayValue = stats.value;
                          }
                          
                          if (!displayArmor && !displayDamage && !displayValue) return null;
                          
                          return (
                            <div className="flex gap-3 mt-1 text-xs flex-wrap">
                              {displayDamage && (
                                <span className="text-red-400 flex items-center gap-1">
                                  <Sword size={12} /> {displayDamage}
                                </span>
                              )}
                              {displayArmor && (
                                <span className="text-blue-400 flex items-center gap-1">
                                  <Shield size={12} /> {displayArmor}
                                </span>
                              )}
                              {displayValue && (
                                <span className="text-yellow-500 flex items-center gap-1">
                                  <Coins size={12} /> {displayValue}g
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {canEquip && (
                              <button 
                                onClick={() => isEquipped ? onUnequip?.(item) : onEquip?.(item)} 
                                className={`px-2 py-1 rounded text-xs ${
                                  isEquipped 
                                    ? 'bg-red-700/60 text-white hover:bg-red-600' 
                                    : 'bg-green-700/60 text-white hover:bg-green-600'
                                }`}
                              >
                                {isEquipped ? 'Unequip' : 'Equip'}
                              </button>
                            )}
                            {canUse && onUse && (
                              <button 
                                onClick={() => onUse(item)} 
                                className="px-2 py-1 bg-blue-700/60 text-white hover:bg-blue-600 rounded text-xs"
                              >
                                Use
                              </button>
                            )}
                            <button onClick={startEdit} className="px-2 py-1 bg-skyrim-gold/20 text-skyrim-gold rounded text-xs">Edit</button>
                            <button onClick={() => onDeltaQuantity(1)} className="px-2 py-1 bg-green-700/60 text-white rounded text-xs">+1</button>
                            <button onClick={() => onDeltaQuantity(-1)} className="px-2 py-1 bg-red-700/60 text-white rounded text-xs">-1</button>
                        </div>
                    </>
                )}
            </div>
            <button onClick={onRemove} className="text-gray-600 hover:text-red-500 flex-shrink-0">
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export const Inventory: React.FC<InventoryProps> = ({ items, setItems, gold, setGold, maxCarryWeight = 300 }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<InventoryItem['type']>('misc');
  const [newDesc, setNewDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | InventoryItem['type']>('all');
  const [sortOrder, setSortOrder] = useState<'name' | 'type' | 'newest' | 'quantity'>('name');
  const [viewMode, setViewMode] = useState<'inventory' | 'equipment'>('inventory');
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);
  const [shopOpen, setShopOpen] = useState(false);

  // Get shop handlers from context
  const { handleShopPurchase, handleShopSell, characterLevel, handleEatItem, handleDrinkItem } = useAppContext();

  // Calculate total carry weight
  const totalWeight = useMemo(() => {
    return items.reduce((total, item) => {
      const weight = item.weight ?? getDefaultItemWeight(item.type);
      return total + (weight * (item.quantity || 1));
    }, 0);
  }, [items]);

  const isOverEncumbered = totalWeight > maxCarryWeight;

  // Category tabs configuration
  const CATEGORY_TABS: { key: 'all' | InventoryItem['type']; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Package size={14} /> },
    { key: 'weapon', label: 'Weapons', icon: <Sword size={14} /> },
    { key: 'apparel', label: 'Apparel', icon: <Shield size={14} /> },
    { key: 'potion', label: 'Potions', icon: <FlaskConical size={14} /> },
    { key: 'food', label: 'Food', icon: <Apple size={14} /> },
    { key: 'drink', label: 'Drink', icon: <Droplets size={14} /> },
    { key: 'camping', label: 'Camping', icon: <Tent size={14} /> },
    { key: 'ingredient', label: 'Ingredients', icon: <FlaskConical size={14} /> },
    { key: 'key', label: 'Keys', icon: <Key size={14} /> },
    { key: 'misc', label: 'Misc', icon: <Gem size={14} /> },
  ];

  // Deduplicate and sort items
  const sortedItems = useMemo(() => {
    // Deduplicate by ID
    const uniqueMap = new Map<string, InventoryItem>();
    items.forEach(item => {
      const existing = uniqueMap.get(item.id);
      if (!existing || (item.createdAt || 0) > (existing.createdAt || 0)) {
        uniqueMap.set(item.id, item);
      }
    });
    
    // Also deduplicate by name (case-insensitive) - merge quantities
    const nameMap = new Map<string, InventoryItem>();
    Array.from(uniqueMap.values()).forEach(item => {
      const key = item.name.toLowerCase().trim();
      const existing = nameMap.get(key);
      if (existing) {
        // Merge quantities for duplicate items
        nameMap.set(key, { ...existing, quantity: existing.quantity + item.quantity });
      } else {
        nameMap.set(key, item);
      }
    });
    
    let uniqueItems = Array.from(nameMap.values());
    
    // Filter by category tab
    if (activeTab !== 'all') {
      uniqueItems = uniqueItems.filter(item => item.type === activeTab);
    }
    
    // Sort based on sortOrder
    return uniqueItems.sort((a, b) => {
      switch (sortOrder) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
        case 'newest':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'quantity':
          return b.quantity - a.quantity || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [items, activeTab, sortOrder]);

  // Get item counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  }, [items]);

  const addItem = () => {
    if (!newName.trim()) return;
    const newItem: InventoryItem = {
      id: uniqueId(),
      characterId: '', // Will be set by setCharacterItems
      name: newName,
      type: newType,
      description: newDesc,
      quantity: 1,
      equipped: false,
      createdAt: Date.now()
    };
    setItems([...items, newItem]);
    setNewName('');
    setNewDesc('');
    setIsAdding(false);
  };

  const handleQuickSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const idx = parseInt(e.target.value);
      if (idx >= 0) {
          const item = COMMON_ITEMS[idx];
          setNewName(item.name);
          setNewType(item.type as any);
          setNewDesc(item.desc);
      }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

    const updateItem = (updated: InventoryItem) => {
        setItems(items.map(i => (i.id === updated.id ? updated : i)));
    };

    const deltaItemQuantity = (id: string, delta: number) => {
        const current = items.find(i => i.id === id);
        if (!current) return;
        const nextQty = current.quantity + delta;
        if (nextQty <= 0) {
            removeItem(id);
            return;
        }
        updateItem({ ...current, quantity: nextQty });
    };

  // Equip an item to a slot
  const equipItem = (item: InventoryItem, slot?: EquipmentSlot) => {
    const targetSlot = slot || getDefaultSlotForItem(item);
    if (!targetSlot) return;
    
    // Unequip any item currently in that slot
    const updatedItems = items.map(i => {
      if (i.id === item.id) {
        return { ...i, equipped: true, slot: targetSlot };
      }
      // Unequip other items in the same slot
      if (i.equipped && i.slot === targetSlot) {
        return { ...i, equipped: false, slot: undefined };
      }
      return i;
    });
    
    setItems(updatedItems);
    setEquipModalOpen(false);
    setSelectedSlot(null);
  };

  // Unequip an item
  const unequipItem = (item: InventoryItem) => {
    updateItem({ ...item, equipped: false, slot: undefined });
  };

  // Open equip modal for a specific slot
  const openEquipModal = (slot: EquipmentSlot) => {
    setSelectedSlot(slot);
    setEquipModalOpen(true);
  };

  // Get items that can be equipped to a specific slot
  const getEquippableItemsForSlot = (slot: EquipmentSlot) => {
    const slotConfig = SLOT_CONFIGS_EXPORT.find(s => s.slot === slot);
    if (!slotConfig) return [];
    
    return items.filter(item => {
      if (item.equipped) return false;
      if (!slotConfig.allowedTypes.includes(item.type)) return false;
      
      // Check if item matches the slot based on name
      const defaultSlot = getDefaultSlotForItem(item);
      return defaultSlot === slot || !defaultSlot;
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword size={18} />;
      case 'apparel': return <Shield size={18} />;
      case 'potion': return <FlaskConical size={18} />;
      case 'food': return <Apple size={18} />;
      case 'drink': return <Droplets size={18} />;
      case 'camping': return <Tent size={18} />;
      case 'ingredient': return <FlaskConical size={18} />;
      case 'key': return <Key size={18} />;
      case 'misc': return <Package size={18} />;
      default: return <Gem size={18} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4">
    <div className="mb-8 p-4 sm:p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2">Inventory</h1>
        <p className="text-gray-500 font-sans text-sm">Your burdens and your treasures.</p>
        
        {/* Encumbrance Display */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <EncumbranceIndicator 
            currentWeight={totalWeight} 
            maxWeight={maxCarryWeight} 
          />
        </div>
        
        {isOverEncumbered && (
          <div className="mt-3 text-red-400 text-sm animate-pulse">
            ⚠️ You are over-encumbered and cannot run!
          </div>
        )}
      </div>

    {/* View Toggle: Inventory / Equipment */}
    <div className="mb-6 flex justify-center">
      <div className="inline-flex rounded-lg border border-skyrim-border overflow-hidden">
        <button
          onClick={() => setViewMode('inventory')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            viewMode === 'inventory'
              ? 'bg-skyrim-gold text-skyrim-dark font-bold'
              : 'bg-black/40 text-gray-400 hover:text-skyrim-gold'
          }`}
        >
          <Backpack size={16} />
          <span>Inventory</span>
        </button>
        <button
          onClick={() => setViewMode('equipment')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            viewMode === 'equipment'
              ? 'bg-skyrim-gold text-skyrim-dark font-bold'
              : 'bg-black/40 text-gray-400 hover:text-skyrim-gold'
          }`}
        >
          <User size={16} />
          <span>Equipment</span>
        </button>
      </div>
    </div>

    {/* Equipment View */}
    {viewMode === 'equipment' && (
      <div className="mb-8">
        <EquipmentHUD
          items={items}
          onUnequip={unequipItem}
          onEquipFromSlot={openEquipModal}
        />
      </div>
    )}

    {/* Equip Modal */}
    {equipModalOpen && selectedSlot && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-skyrim-paper border-2 border-skyrim-gold rounded-lg shadow-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-serif text-skyrim-gold mb-4">
            Select item for {selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)}
          </h3>
          
          {getEquippableItemsForSlot(selectedSlot).length > 0 ? (
            <div className="space-y-2">
              {getEquippableItemsForSlot(selectedSlot).map(item => (
                <button
                  key={item.id}
                  onClick={() => equipItem(item, selectedSlot)}
                  className="w-full p-3 bg-black/40 border border-skyrim-border rounded hover:border-skyrim-gold hover:bg-black/60 transition-colors text-left flex items-center gap-3"
                >
                  <div className="p-2 rounded-full bg-skyrim-gold/20 text-skyrim-gold">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-skyrim-gold font-serif">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                    {(item.armor || item.damage) && (
                      <div className="flex gap-3 mt-1 text-xs">
                        {item.armor && <span className="text-blue-400">Armor: {item.armor}</span>}
                        {item.damage && <span className="text-red-400">Damage: {item.damage}</span>}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-4">
              No suitable items for this slot
            </p>
          )}
          
          <button
            onClick={() => { setEquipModalOpen(false); setSelectedSlot(null); }}
            className="mt-4 w-full py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )}

    {/* Inventory View */}
    {viewMode === 'inventory' && (
      <>
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/40 p-4 rounded border border-skyrim-border">
          <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-700 text-yellow-500">
                  <Coins size={24} />
              </div>
              <div className="flex-1">
                  <div className="text-xs text-gray-400 uppercase tracking-widest">Gold Septims</div>
                  <input 
                    type="number" 
                    value={gold} 
                    onChange={(e) => setGold(parseInt(e.target.value) || 0)}
                    className="bg-transparent text-2xl font-serif text-yellow-500 w-32 focus:outline-none"
                  />
                  <div className="text-[10px] text-amber-500 mt-1">
                    ⚠ Manually adjust only if needed. Shop transactions are automatic.
                  </div>
              </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setShopOpen(true)}
                className="px-4 py-2 bg-amber-700 text-white hover:bg-amber-600 transition-colors rounded flex items-center gap-2 font-bold"
            >
                <ShoppingBag size={18} /> Shop
            </button>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className="px-4 py-2 border border-skyrim-gold text-skyrim-gold hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors rounded flex items-center gap-2"
            >
                <Plus size={18} /> Add Item
            </button>
          </div>
      </div>

      {isAdding && (
         <div className="mb-6 bg-skyrim-paper border border-skyrim-gold p-4 rounded flex flex-col gap-4 animate-in fade-in">
             <div className="bg-amber-900/30 border border-amber-600 rounded px-3 py-2 text-amber-200 text-sm">
               <strong>⚠ Manual Add:</strong> Only use this if you cannot find the item you want in the shop. Remember to manually deduct the gold cost from yourself.
             </div>
             <div className="w-full">
                 <label className="text-xs text-gray-500 uppercase">Quick Select</label>
                 <select className="w-full bg-black/40 border border-skyrim-border p-2 rounded text-gray-200 text-sm" onChange={handleQuickSelect} defaultValue={-1}>
                     <option value={-1}>-- Custom --</option>
                     {COMMON_ITEMS.map((item, i) => (
                         <option key={i} value={i}>{item.name}</option>
                     ))}
                 </select>
             </div>
             <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex-1 w-full">
                     <label className="text-xs text-gray-500 uppercase">Item Name</label>
                     <input className="w-full bg-black/40 border border-skyrim-border p-2 rounded text-gray-200" value={newName} onChange={e => setNewName(e.target.value)} />
                 </div>
                 <div className="w-full md:w-32">
                     <label className="text-xs text-gray-500 uppercase">Type</label>
                     <select className="w-full bg-black/40 border border-skyrim-border p-2 rounded text-gray-200" value={newType} onChange={e => setNewType(e.target.value as any)}>
                         <option value="weapon">Weapon</option>
                         <option value="apparel">Apparel</option>
                         <option value="potion">Potion</option>
                         <option value="ingredient">Ingredient</option>
                         <option value="key">Key</option>
                         <option value="misc">Misc</option>
                     </select>
                 </div>
             </div>
             <div className="flex-1 w-full">
                 <label className="text-xs text-gray-500 uppercase">Description</label>
                 <input className="w-full bg-black/40 border border-skyrim-border p-2 rounded text-gray-200" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
             </div>
             <div className="flex justify-end">
                <button onClick={addItem} className="px-6 py-2 bg-skyrim-gold text-skyrim-dark font-bold rounded">Add to Inventory</button>
             </div>
         </div>
      )}

      {/* Category Tabs */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-1 min-w-max pb-2">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.key 
                  ? 'bg-skyrim-gold text-skyrim-dark font-bold' 
                  : 'bg-black/30 text-gray-400 hover:text-skyrim-gold hover:bg-black/50 border border-skyrim-border/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {categoryCounts[tab.key] > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-skyrim-dark/30' : 'bg-skyrim-gold/20 text-skyrim-gold'
                }`}>
                  {categoryCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
          {activeTab !== 'all' && ` in ${CATEGORY_TABS.find(t => t.key === activeTab)?.label}`}
        </span>
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-500" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="bg-black/40 border border-skyrim-border rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-skyrim-gold"
          >
            <option value="name">Name (A-Z)</option>
            <option value="type">Type</option>
            <option value="newest">Newest First</option>
            <option value="quantity">Quantity</option>
          </select>
        </div>
      </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sortedItems.map((item) => (
        <InventoryItemCard
          key={item.id}
          item={item}
          getIcon={getIcon}
          onUpdate={updateItem}
          onDeltaQuantity={(delta) => deltaItemQuantity(item.id, delta)}
          onRemove={() => removeItem(item.id)}
          onEquip={(item) => equipItem(item)}
          onUnequip={unequipItem}
          onUse={(item) => {
            // Use the appropriate handler based on item type
            if (item.type === 'food' || item.type === 'ingredient') {
              handleEatItem(item);
            } else if (item.type === 'drink') {
              handleDrinkItem(item);
            } else if (item.type === 'potion') {
              // Potions can be either for hunger/thirst (drink) or healing (eat counts as consume)
              // For now, treat potions as drinks (thirst reduction)
              handleDrinkItem(item);
            }
          }}
        />
      ))}
        {sortedItems.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-600 italic font-serif">
                {activeTab === 'all' ? 'Your pockets are empty.' : `No ${CATEGORY_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} in your inventory.`}
            </div>
        )}
      </div>
      </>
    )}

    {/* Shop Modal */}
    <ShopModal
      open={shopOpen}
      onClose={() => setShopOpen(false)}
      gold={gold}
      onPurchase={handleShopPurchase}
      inventory={items}
      onSell={handleShopSell}
      characterLevel={characterLevel}
    />
    </div>
  );
};