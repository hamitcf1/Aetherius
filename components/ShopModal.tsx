import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, ShoppingBag, Coins, Search, Package, Sword, Shield, FlaskConical, Tent, Apple, Droplets, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import type { InventoryItem } from '../types';

export interface ShopItem {
  id: string;
  name: string;
  type: 'weapon' | 'apparel' | 'potion' | 'ingredient' | 'misc' | 'food' | 'drink' | 'camping';
  description: string;
  price: number;
  category: string;
}

// Comprehensive Skyrim-themed shop inventory
const SHOP_INVENTORY: ShopItem[] = [
  // === FOOD ===
  { id: 'bread', name: 'Bread', type: 'food', description: 'A fresh loaf of bread. Restores hunger.', price: 2, category: 'Food' },
  { id: 'apple', name: 'Apple', type: 'food', description: 'A crisp red apple from the orchards.', price: 1, category: 'Food' },
  { id: 'cheese_wheel', name: 'Cheese Wheel', type: 'food', description: 'A wheel of aged cheese. Very filling.', price: 10, category: 'Food' },
  { id: 'venison', name: 'Cooked Venison', type: 'food', description: 'Tender deer meat, roasted over a fire.', price: 8, category: 'Food' },
  { id: 'salmon_steak', name: 'Grilled Salmon', type: 'food', description: 'Fresh salmon from the rivers of Skyrim.', price: 6, category: 'Food' },
  { id: 'sweetroll', name: 'Sweetroll', type: 'food', description: 'A delicious pastry. Nobody will steal this one.', price: 5, category: 'Food' },
  { id: 'beef_stew', name: 'Beef Stew', type: 'food', description: 'Hearty stew that warms the soul. Very filling.', price: 15, category: 'Food' },
  { id: 'cabbage', name: 'Cabbage', type: 'food', description: 'A leafy green vegetable.', price: 1, category: 'Food' },
  { id: 'potato', name: 'Potato', type: 'food', description: 'A starchy tuber from the fields.', price: 1, category: 'Food' },
  { id: 'leek', name: 'Leek', type: 'food', description: 'A pungent vegetable used in soups.', price: 1, category: 'Food' },
  { id: 'rabbit_haunch', name: 'Rabbit Haunch', type: 'food', description: 'A leg of roasted rabbit.', price: 4, category: 'Food' },
  { id: 'mammoth_snout', name: 'Mammoth Snout', type: 'food', description: 'An exotic delicacy from giant beasts.', price: 25, category: 'Food' },
  { id: 'horker_meat', name: 'Horker Meat', type: 'food', description: 'Fatty meat from the northern shores.', price: 5, category: 'Food' },
  { id: 'travel_rations', name: 'Travel Rations', type: 'food', description: 'Dried meat, hardtack, and nuts. Lasts on the road.', price: 20, category: 'Food' },

  // === DRINKS ===
  { id: 'water_skin', name: 'Water Skin', type: 'drink', description: 'Fresh water in a leather skin. Quenches thirst.', price: 3, category: 'Drinks' },
  { id: 'alto_wine', name: 'Alto Wine', type: 'drink', description: 'Fine wine from Cyrodiil. Refreshing.', price: 12, category: 'Drinks' },
  { id: 'nord_mead', name: 'Nord Mead', type: 'drink', description: 'Honey mead brewed in the traditional way.', price: 8, category: 'Drinks' },
  { id: 'black_briar_mead', name: 'Black-Briar Mead', type: 'drink', description: 'Premium mead from Riften. Smooth and potent.', price: 20, category: 'Drinks' },
  { id: 'ale', name: 'Ale', type: 'drink', description: 'A common tavern drink. Gets the job done.', price: 5, category: 'Drinks' },
  { id: 'milk', name: 'Milk', type: 'drink', description: 'Fresh cow milk. Wholesome.', price: 2, category: 'Drinks' },
  { id: 'spiced_wine', name: 'Spiced Wine', type: 'drink', description: 'Wine infused with exotic spices. Warms you up.', price: 15, category: 'Drinks' },
  { id: 'skooma', name: 'Skooma', type: 'drink', description: 'Illegal moon sugar brew. Buyer beware.', price: 50, category: 'Drinks' },

  // === POTIONS ===
  { id: 'health_potion_minor', name: 'Minor Health Potion', type: 'potion', description: 'Restores 25 health.', price: 15, category: 'Potions' },
  { id: 'health_potion', name: 'Health Potion', type: 'potion', description: 'Restores 50 health.', price: 35, category: 'Potions' },
  { id: 'health_potion_major', name: 'Plentiful Health Potion', type: 'potion', description: 'Restores 100 health.', price: 75, category: 'Potions' },
  { id: 'magicka_potion_minor', name: 'Minor Magicka Potion', type: 'potion', description: 'Restores 25 magicka.', price: 15, category: 'Potions' },
  { id: 'magicka_potion', name: 'Magicka Potion', type: 'potion', description: 'Restores 50 magicka.', price: 35, category: 'Potions' },
  { id: 'stamina_potion_minor', name: 'Minor Stamina Potion', type: 'potion', description: 'Restores 25 stamina.', price: 15, category: 'Potions' },
  { id: 'stamina_potion', name: 'Stamina Potion', type: 'potion', description: 'Restores 50 stamina.', price: 35, category: 'Potions' },
  { id: 'cure_disease', name: 'Cure Disease Potion', type: 'potion', description: 'Cures all diseases.', price: 50, category: 'Potions' },
  { id: 'cure_poison', name: 'Cure Poison', type: 'potion', description: 'Removes poison effects.', price: 40, category: 'Potions' },
  { id: 'invisibility_potion', name: 'Invisibility Potion', type: 'potion', description: 'Become invisible for 30 seconds.', price: 120, category: 'Potions' },
  { id: 'resist_fire', name: 'Resist Fire Potion', type: 'potion', description: 'Resist 50% fire damage for 60 seconds.', price: 60, category: 'Potions' },
  { id: 'resist_frost', name: 'Resist Frost Potion', type: 'potion', description: 'Resist 50% frost damage for 60 seconds.', price: 60, category: 'Potions' },
  { id: 'resist_shock', name: 'Resist Shock Potion', type: 'potion', description: 'Resist 50% shock damage for 60 seconds.', price: 60, category: 'Potions' },

  // === CAMPING / SURVIVAL ===
  { id: 'bedroll', name: 'Bedroll', type: 'camping', description: 'A simple bedroll for sleeping outdoors. Basic rest.', price: 25, category: 'Camping' },
  { id: 'tent', name: 'Traveler\'s Tent', type: 'camping', description: 'A sturdy canvas tent. Better sleep when camping.', price: 100, category: 'Camping' },
  { id: 'camping_kit', name: 'Camping Kit', type: 'camping', description: 'Tent, bedroll, and cooking pot. Full wilderness setup.', price: 200, category: 'Camping' },
  { id: 'firewood', name: 'Firewood Bundle', type: 'camping', description: 'Dry wood for campfires. Essential for cold nights.', price: 5, category: 'Camping' },
  { id: 'cooking_pot', name: 'Cooking Pot', type: 'camping', description: 'A portable pot for making stews and soups.', price: 30, category: 'Camping' },
  { id: 'fur_blanket', name: 'Fur Blanket', type: 'camping', description: 'A warm fur blanket. Improves rest quality.', price: 45, category: 'Camping' },
  { id: 'torch', name: 'Torch', type: 'misc', description: 'A wooden torch. Lights your way in darkness.', price: 2, category: 'Camping' },
  { id: 'lantern', name: 'Lantern', type: 'misc', description: 'An oil lantern. Long-lasting light source.', price: 25, category: 'Camping' },

  // === WEAPONS ===
  { id: 'iron_dagger', name: 'Iron Dagger', type: 'weapon', description: 'A simple iron dagger. Lightweight and fast.', price: 20, category: 'Weapons' },
  { id: 'iron_sword', name: 'Iron Sword', type: 'weapon', description: 'A standard iron sword. Reliable.', price: 45, category: 'Weapons' },
  { id: 'steel_sword', name: 'Steel Sword', type: 'weapon', description: 'A well-crafted steel blade.', price: 90, category: 'Weapons' },
  { id: 'iron_war_axe', name: 'Iron War Axe', type: 'weapon', description: 'A brutal chopping weapon.', price: 50, category: 'Weapons' },
  { id: 'iron_mace', name: 'Iron Mace', type: 'weapon', description: 'A heavy crushing weapon.', price: 55, category: 'Weapons' },
  { id: 'hunting_bow', name: 'Hunting Bow', type: 'weapon', description: 'A simple wooden bow for hunting.', price: 50, category: 'Weapons' },
  { id: 'long_bow', name: 'Long Bow', type: 'weapon', description: 'A longer bow with better range.', price: 80, category: 'Weapons' },
  { id: 'iron_arrows', name: 'Iron Arrows (20)', type: 'weapon', description: 'A bundle of iron-tipped arrows.', price: 10, category: 'Weapons' },
  { id: 'steel_arrows', name: 'Steel Arrows (20)', type: 'weapon', description: 'A bundle of steel-tipped arrows.', price: 20, category: 'Weapons' },
  { id: 'iron_greatsword', name: 'Iron Greatsword', type: 'weapon', description: 'A massive two-handed blade.', price: 75, category: 'Weapons' },
  { id: 'staff_flames', name: 'Staff of Flames', type: 'weapon', description: 'A staff that shoots fire. Limited charges.', price: 250, category: 'Weapons' },

  // === APPAREL / ARMOR ===
  { id: 'hide_armor', name: 'Hide Armor', type: 'apparel', description: 'Basic leather armor made from animal hides.', price: 50, category: 'Armor' },
  { id: 'leather_armor', name: 'Leather Armor', type: 'apparel', description: 'Tanned leather armor. Light and flexible.', price: 90, category: 'Armor' },
  { id: 'iron_armor', name: 'Iron Armor', type: 'apparel', description: 'Heavy iron plate armor.', price: 150, category: 'Armor' },
  { id: 'steel_armor', name: 'Steel Armor', type: 'apparel', description: 'Strong steel plate armor.', price: 275, category: 'Armor' },
  { id: 'hide_boots', name: 'Hide Boots', type: 'apparel', description: 'Simple leather boots.', price: 15, category: 'Armor' },
  { id: 'leather_boots', name: 'Leather Boots', type: 'apparel', description: 'Comfortable travel boots.', price: 25, category: 'Armor' },
  { id: 'hide_helmet', name: 'Hide Helmet', type: 'apparel', description: 'A basic leather cap.', price: 20, category: 'Armor' },
  { id: 'iron_helmet', name: 'Iron Helmet', type: 'apparel', description: 'A sturdy iron helm.', price: 60, category: 'Armor' },
  { id: 'iron_shield', name: 'Iron Shield', type: 'apparel', description: 'A heavy iron shield.', price: 65, category: 'Armor' },
  { id: 'leather_gloves', name: 'Leather Gloves', type: 'apparel', description: 'Flexible leather gloves.', price: 15, category: 'Armor' },
  { id: 'fur_cloak', name: 'Fur Cloak', type: 'apparel', description: 'A warm fur cloak for cold climates.', price: 75, category: 'Armor' },
  { id: 'common_clothes', name: 'Common Clothes', type: 'apparel', description: 'Simple peasant attire.', price: 10, category: 'Armor' },
  { id: 'fine_clothes', name: 'Fine Clothes', type: 'apparel', description: 'Elegant clothing for nobles.', price: 100, category: 'Armor' },

  // === MISC / TOOLS ===
  { id: 'lockpick', name: 'Lockpick', type: 'misc', description: 'A delicate tool for opening locks.', price: 5, category: 'Misc' },
  { id: 'lockpick_bundle', name: 'Lockpick Bundle (10)', type: 'misc', description: 'A set of ten lockpicks.', price: 40, category: 'Misc' },
  { id: 'rope', name: 'Rope (50ft)', type: 'misc', description: 'A coil of sturdy rope.', price: 15, category: 'Misc' },
  { id: 'soul_gem_petty', name: 'Petty Soul Gem', type: 'misc', description: 'An empty petty soul gem.', price: 30, category: 'Misc' },
  { id: 'soul_gem_lesser', name: 'Lesser Soul Gem', type: 'misc', description: 'An empty lesser soul gem.', price: 60, category: 'Misc' },
  { id: 'soul_gem_common', name: 'Common Soul Gem', type: 'misc', description: 'An empty common soul gem.', price: 120, category: 'Misc' },
  { id: 'inkwell_quill', name: 'Inkwell & Quill', type: 'misc', description: 'For writing letters and notes.', price: 10, category: 'Misc' },
  { id: 'journal_blank', name: 'Blank Journal', type: 'misc', description: 'An empty journal for your thoughts.', price: 15, category: 'Misc' },
  { id: 'map_skyrim', name: 'Map of Skyrim', type: 'misc', description: 'A detailed map of the province.', price: 50, category: 'Misc' },
  { id: 'backpack', name: 'Traveler\'s Backpack', type: 'misc', description: 'A sturdy pack for carrying supplies.', price: 75, category: 'Misc' },
  { id: 'shovel', name: 'Shovel', type: 'misc', description: 'For digging. Or burying things.', price: 20, category: 'Misc' },
  { id: 'pickaxe', name: 'Pickaxe', type: 'misc', description: 'For mining ore from veins.', price: 35, category: 'Misc' },
  { id: 'woodcutter_axe', name: 'Woodcutter\'s Axe', type: 'misc', description: 'For chopping wood. Not a weapon.', price: 20, category: 'Misc' },

  // === INGREDIENTS ===
  { id: 'blue_mountain_flower', name: 'Blue Mountain Flower', type: 'ingredient', description: 'A common alchemical ingredient.', price: 3, category: 'Ingredients' },
  { id: 'red_mountain_flower', name: 'Red Mountain Flower', type: 'ingredient', description: 'Used in health potions.', price: 3, category: 'Ingredients' },
  { id: 'lavender', name: 'Lavender', type: 'ingredient', description: 'A fragrant purple flower.', price: 2, category: 'Ingredients' },
  { id: 'salt_pile', name: 'Salt Pile', type: 'ingredient', description: 'For cooking and alchemy.', price: 2, category: 'Ingredients' },
  { id: 'garlic', name: 'Garlic', type: 'ingredient', description: 'Pungent bulb. Useful against vampires?', price: 3, category: 'Ingredients' },
  { id: 'deathbell', name: 'Deathbell', type: 'ingredient', description: 'A sinister flower. Poison ingredient.', price: 8, category: 'Ingredients' },
  { id: 'nightshade', name: 'Nightshade', type: 'ingredient', description: 'Deadly purple flowers.', price: 10, category: 'Ingredients' },
  { id: 'giants_toe', name: 'Giant\'s Toe', type: 'ingredient', description: 'Rare and valuable. Powerful alchemy.', price: 50, category: 'Ingredients' },
  { id: 'moon_sugar', name: 'Moon Sugar', type: 'ingredient', description: 'Illegal sweetener. Skooma base.', price: 30, category: 'Ingredients' },
];

const CATEGORIES = ['All', 'Food', 'Drinks', 'Potions', 'Camping', 'Weapons', 'Armor', 'Misc', 'Ingredients'];

const categoryIcons: Record<string, React.ReactNode> = {
  All: <Package size={14} />,
  Food: <Apple size={14} />,
  Drinks: <Droplets size={14} />,
  Potions: <FlaskConical size={14} />,
  Camping: <Tent size={14} />,
  Weapons: <Sword size={14} />,
  Armor: <Shield size={14} />,
  Misc: <Package size={14} />,
  Ingredients: <FlaskConical size={14} />,
};

// Calculate sell price (50% of base value, minimum 1 gold)
const getSellPrice = (item: InventoryItem): number => {
  // Try to find matching shop item for base price
  const shopItem = SHOP_INVENTORY.find(si => 
    si.name.toLowerCase() === item.name.toLowerCase()
  );
  if (shopItem) {
    return Math.max(1, Math.floor(shopItem.price * 0.5));
  }
  // Default pricing based on type
  const basePrices: Record<string, number> = {
    weapon: 20,
    apparel: 15,
    potion: 10,
    ingredient: 2,
    misc: 5,
    key: 0,
  };
  return Math.max(1, Math.floor((basePrices[item.type] || 5) * 0.5));
};

interface ShopModalProps {
  open: boolean;
  onClose: () => void;
  gold: number;
  onPurchase: (item: ShopItem, quantity: number) => void;
  inventory?: InventoryItem[];
  onSell?: (item: InventoryItem, quantity: number, totalGold: number) => void;
}

export function ShopModal({ open, onClose, gold, onPurchase, inventory = [], onSell }: ShopModalProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
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

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuantities({});
      setSearch('');
    }
  }, [open]);

  const filteredShopItems = useMemo(() => {
    return SHOP_INVENTORY.filter(item => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesSearch = !search || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const filteredInventoryItems = useMemo(() => {
    return inventory.filter(item => {
      // Don't allow selling keys
      if (item.type === 'key') return false;
      if ((item.quantity || 0) <= 0) return false;
      const matchesSearch = !search || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [inventory, search]);

  const getQuantity = (id: string) => quantities[id] || 1;
  const setQuantity = (id: string, qty: number, max?: number) => {
    const newQty = Math.max(1, max ? Math.min(qty, max) : qty);
    setQuantities(prev => ({ ...prev, [id]: newQty }));
  };

  const handleBuy = (item: ShopItem) => {
    const qty = getQuantity(item.id);
    const total = item.price * qty;
    if (gold >= total) {
      onPurchase(item, qty);
      setQuantities(prev => ({ ...prev, [item.id]: 1 }));
    }
  };

  const handleSell = (item: InventoryItem) => {
    if (!onSell) return;
    const qty = Math.min(getQuantity(item.id), item.quantity || 1);
    const unitPrice = getSellPrice(item);
    const total = unitPrice * qty;
    onSell(item, qty, total);
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-2xl bg-skyrim-paper border-2 border-skyrim-gold rounded-lg shadow-2xl flex flex-col"
        style={{ maxHeight: 'min(550px, 80vh)', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-skyrim-border flex items-center justify-between gap-3 bg-skyrim-dark/50 rounded-t-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-skyrim-gold" size={20} />
            <h2 className="text-lg font-serif text-skyrim-gold">General Goods</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 rounded border border-skyrim-border">
              <Coins size={14} className="text-yellow-500" />
              <span className="text-yellow-400 font-bold text-sm">{gold}</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-black/40 rounded transition-colors">
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Buy/Sell Tabs */}
        <div className="flex border-b border-skyrim-border/60 bg-black/20 flex-shrink-0">
          <button
            onClick={() => { setMode('buy'); setSearch(''); setCategory('All'); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              mode === 'buy'
                ? 'bg-skyrim-gold/20 text-skyrim-gold border-b-2 border-skyrim-gold'
                : 'text-gray-400 hover:text-gray-200 hover:bg-black/20'
            }`}
          >
            <ArrowDownToLine size={16} />
            Buy
          </button>
          <button
            onClick={() => { setMode('sell'); setSearch(''); }}
            disabled={!onSell}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              mode === 'sell'
                ? 'bg-green-900/30 text-green-400 border-b-2 border-green-500'
                : 'text-gray-400 hover:text-gray-200 hover:bg-black/20'
            } ${!onSell ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ArrowUpFromLine size={16} />
            Sell
          </button>
        </div>

        {/* Search & Categories (Buy mode only) */}
        <div className="px-3 py-2.5 border-b border-skyrim-border/40 bg-black/10 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={mode === 'buy' ? 'Search shop...' : 'Search inventory...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-skyrim-border rounded text-gray-200 placeholder-gray-500 focus:border-skyrim-gold focus:outline-none text-sm"
            />
          </div>
          {mode === 'buy' && (
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    category === cat
                      ? 'bg-skyrim-gold text-skyrim-dark font-bold'
                      : 'bg-black/30 text-gray-400 hover:text-gray-200 hover:bg-black/50'
                  }`}
                >
                  {categoryIcons[cat]}
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {mode === 'buy' ? (
            // BUY MODE
            filteredShopItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No items found.</div>
            ) : (
              <div className="divide-y divide-skyrim-border/30">
                {filteredShopItems.map(item => {
                  const qty = getQuantity(item.id);
                  const total = item.price * qty;
                  const canAfford = gold >= total;

                  return (
                    <div
                      key={item.id}
                      className={`px-3 py-2.5 flex items-center gap-3 hover:bg-black/20 transition-colors ${
                        !canAfford ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium text-sm truncate">{item.name}</span>
                          <span className="text-gray-500 text-xs">({item.category})</span>
                        </div>
                        <p className="text-gray-500 text-xs truncate">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold">
                          <Coins size={12} />
                          {item.price}
                        </div>
                        <div className="flex items-center bg-black/40 rounded border border-skyrim-border/50">
                          <button
                            onClick={() => setQuantity(item.id, qty - 1)}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-white text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-gray-200 text-xs">{qty}</span>
                          <button
                            onClick={() => setQuantity(item.id, qty + 1)}
                            className="px-1.5 py-0.5 text-gray-400 hover:text-white text-xs"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford}
                          className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                            canAfford
                              ? 'bg-skyrim-gold text-skyrim-dark hover:bg-yellow-400'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Buy {total}g
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // SELL MODE
            filteredInventoryItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                {search ? 'No matching items in your inventory.' : 'No items to sell.'}
              </div>
            ) : (
              <div className="divide-y divide-skyrim-border/30">
                {filteredInventoryItems.map(item => {
                  const maxQty = item.quantity || 1;
                  const qty = Math.min(getQuantity(item.id), maxQty);
                  const unitPrice = getSellPrice(item);
                  const total = unitPrice * qty;

                  return (
                    <div
                      key={item.id}
                      className="px-3 py-2.5 flex items-center gap-3 hover:bg-black/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-200 font-medium text-sm truncate">{item.name}</span>
                          <span className="text-gray-500 text-xs">×{item.quantity}</span>
                          {item.equipped && (
                            <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">Equipped</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                          <Coins size={12} />
                          {unitPrice}/ea
                        </div>
                        {maxQty > 1 && (
                          <div className="flex items-center bg-black/40 rounded border border-skyrim-border/50">
                            <button
                              onClick={() => setQuantity(item.id, qty - 1, maxQty)}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-white text-xs"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-gray-200 text-xs">{qty}</span>
                            <button
                              onClick={() => setQuantity(item.id, qty + 1, maxQty)}
                              className="px-1.5 py-0.5 text-gray-400 hover:text-white text-xs"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleSell(item)}
                          className="px-2.5 py-1 rounded text-xs font-bold bg-green-700 text-white hover:bg-green-600 transition-colors"
                        >
                          Sell +{total}g
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-skyrim-border/60 bg-black/20 flex-shrink-0">
          <p className="text-gray-500 text-xs text-center">
            {mode === 'buy' 
              ? `${filteredShopItems.length} items available` 
              : `${filteredInventoryItems.length} items to sell (50% value)`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export { SHOP_INVENTORY };
