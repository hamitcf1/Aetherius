import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Shield, Sword, FlaskConical, Gem, Key, Package, Trash2, Plus, Coins } from 'lucide-react';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

interface InventoryProps {
  items: InventoryItem[];
  setItems: (items: InventoryItem[]) => void;
  gold: number;
  setGold: (amount: number) => void;
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

export const Inventory: React.FC<InventoryProps> = ({ items, setItems, gold, setGold }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<InventoryItem['type']>('misc');
  const [newDesc, setNewDesc] = useState('');

  const addItem = () => {
    if (!newName.trim()) return;
    const newItem: InventoryItem = {
      id: uniqueId(),
      name: newName,
      type: newType,
      description: newDesc,
      quantity: 1,
      equipped: false
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword size={18} />;
      case 'apparel': return <Shield size={18} />;
      case 'potion': return <FlaskConical size={18} />;
      case 'ingredient': return <Package size={18} />;
      case 'key': return <Key size={18} />;
      default: return <Gem size={18} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8 p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2">Inventory</h1>
        <p className="text-gray-500 font-sans text-sm">Your burdens and your treasures.</p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-black/40 p-4 rounded border border-skyrim-border">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-900/30 rounded-full border border-yellow-700 text-yellow-500">
                  <Coins size={24} />
              </div>
              <div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest">Gold Septims</div>
                  <input 
                    type="number" 
                    value={gold} 
                    onChange={(e) => setGold(parseInt(e.target.value) || 0)}
                    className="bg-transparent text-2xl font-serif text-yellow-500 w-32 focus:outline-none"
                  />
              </div>
          </div>
          <button 
              onClick={() => setIsAdding(!isAdding)}
              className="px-4 py-2 border border-skyrim-gold text-skyrim-gold hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors rounded flex items-center gap-2"
          >
              <Plus size={18} /> Add Item
          </button>
      </div>

      {isAdding && (
         <div className="mb-6 bg-skyrim-paper border border-skyrim-gold p-4 rounded flex flex-col gap-4 animate-in fade-in">
             <div className="w-full">
                 <label className="text-xs text-gray-500 uppercase">Quick Select</label>
                 <select className="w-full bg-black/40 border border-skyrim-border p-2 rounded text-gray-200 text-sm" onChange={handleQuickSelect} defaultValue={-1}>
                     <option value={-1}>-- Custom --</option>
                     {COMMON_ITEMS.map((item, i) => (
                         <option key={i} value={i}>{item.name}</option>
                     ))}
                 </select>
             </div>
             <div className="flex flex-col md:flex-row gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
            <div key={item.id} className="bg-skyrim-paper/60 border border-skyrim-border p-4 rounded flex items-center gap-4 hover:border-skyrim-gold/50 transition-colors">
                <div className={`p-3 rounded-full bg-black/40 text-skyrim-gold border border-skyrim-border`}>
                    {getIcon(item.type)}
                </div>
                <div className="flex-1">
                    <h3 className="text-skyrim-gold font-serif">{item.name} <span className="text-xs text-gray-500 ml-2">x{item.quantity}</span></h3>
                    <p className="text-sm text-gray-400">{item.description}</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-500">
                    <Trash2 size={16} />
                </button>
            </div>
        ))}
        {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-600 italic font-serif">
                Your pockets are empty.
            </div>
        )}
      </div>
    </div>
  );
};