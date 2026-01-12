import React, { useState, useMemo } from 'react';
import { X, Moon, TreePine, Tent, Home, Clock, Coins } from 'lucide-react';
import { InventoryItem } from '../types';
import { EquipmentHUD } from './EquipmentHUD';
import type { RestOptions } from './SurvivalModals';

interface BonfireMenuProps {
  open: boolean;
  onClose: () => void;
  onConfirmRest: (options: RestOptions) => void;
  onApplyChanges: (changedItems: InventoryItem[]) => void;
  inventory: InventoryItem[];
  gold: number;
  hasCampingGear: boolean;
  hasBedroll: boolean;
  previewOptions?: RestOptions | null;
}

export const BonfireMenu: React.FC<BonfireMenuProps> = ({ open, onClose, onConfirmRest, onApplyChanges, inventory, gold, hasCampingGear, hasBedroll, previewOptions }) => {
  const [localInventory, setLocalInventory] = useState<InventoryItem[]>(() => inventory.map(i => ({ ...i })));
  const [restType, setRestType] = useState<RestOptions['type']>(previewOptions?.type ?? 'outside');
  const [hours, setHours] = useState<number>(previewOptions?.hours ?? 8);

  React.useEffect(() => {
    if (!open) return;
    setLocalInventory(inventory.map(i => ({ ...i })));
    setRestType(previewOptions?.type ?? 'outside');
    setHours(previewOptions?.hours ?? 8);
  }, [open, inventory, previewOptions]);

  const restQuality = useMemo(() => {
    if (restType === 'inn') return { label: 'Well Rested', fatigueReduction: 50, desc: 'A warm bed at the inn. Full rest.' };
    if (restType === 'camp') {
      if (hasCampingGear) return { label: 'Rested', fatigueReduction: 40, desc: 'Your tent provides good shelter.' };
      if (hasBedroll) return { label: 'Somewhat Rested', fatigueReduction: 30, desc: 'Bedroll offers basic comfort.' };
    }
    return { label: 'Poorly Rested', fatigueReduction: 15, desc: 'Sleeping on the ground. Uncomfortable.' };
  }, [restType, hasCampingGear, hasBedroll]);

  const equipItem = (item: InventoryItem, slot?: any) => {
    setLocalInventory(prev => prev.map(it => {
      if (it.id === item.id) return { ...it, equipped: true, slot };
      if (it.equipped && it.slot === slot && it.id !== item.id) return { ...it, equipped: false, slot: undefined };
      return it;
    }));
  };

  const unequipItem = (item: InventoryItem) => {
    setLocalInventory(prev => prev.map(it => it.id === item.id ? { ...it, equipped: false, slot: undefined } : it));
  };

  const changedItems = useMemo(() => {
    const originalById = new Map<string, InventoryItem>(inventory.map(i => [i.id, i]));
    return localInventory.filter(it => {
      const orig = originalById.get(it.id);
      if (!orig) return true;
      return (orig.equipped !== it.equipped) || (orig.slot !== it.slot);
    });
  }, [inventory, localInventory]);

  const applyChanges = () => {
    if (changedItems.length === 0) return;
    onApplyChanges(changedItems);
  };

  const confirmRest = () => {
    applyChanges();
    const options: RestOptions = { type: restType, hours, innCost: restType === 'inn' ? 10 : undefined };
    onConfirmRest(options);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-4xl bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-skyrim-border flex items-center justify-between bg-skyrim-dark/50">
          <div className="flex items-center gap-3">
            <Moon className="text-skyrim-gold" size={20} />
            <h2 className="text-lg font-serif text-skyrim-gold">Bonfire</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-300">Gold: {gold}g</div>
            <button onClick={onClose} className="p-2 hover:bg-black/40 rounded">
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Left: Prepare - Equipment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-100">Prepare</h3>
              <div className="text-xs text-gray-400">Staged changes are local until applied</div>
            </div>
            <div className="p-3 bg-black/20 border border-skyrim-border rounded">
              <EquipmentHUD items={localInventory} onUnequip={unequipItem} onEquipFromSlot={(slot) => {/* open small slot picker inline by filtering - keep simple */}} />
            </div>
            <div className="flex gap-2">
              <button onClick={applyChanges} className="px-3 py-2 bg-skyrim-gold text-skyrim-dark rounded font-bold hover:bg-yellow-400">Apply Changes</button>
              <button onClick={() => { setLocalInventory(inventory.map(i => ({ ...i }))); }} className="px-3 py-2 bg-gray-700 text-white rounded">Reset</button>
            </div>
            {changedItems.length > 0 && (
              <div className="text-xs text-green-300">{changedItems.length} staged change(s) will be saved when applied.</div>
            )}
          </div>

          {/* Right: Rest Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-100">Rest</h3>
              <div className="text-xs text-gray-400">{restQuality.label}</div>
            </div>

            <div className="p-3 bg-black/20 border border-skyrim-border rounded space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setRestType('outside')} className={`p-2 rounded border ${restType === 'outside' ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold' : 'bg-black/30 border-skyrim-border text-gray-400'}`}>
                  <TreePine size={16} />
                  <div className="text-[10px] mt-1">Outside</div>
                </button>
                <button onClick={() => setRestType('camp')} className={`p-2 rounded border ${restType === 'camp' ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold' : 'bg-black/30 border-skyrim-border text-gray-400'}`}>
                  <Tent size={16} />
                  <div className="text-[10px] mt-1">Camp</div>
                </button>
                <button onClick={() => setRestType('inn')} className={`p-2 rounded border ${restType === 'inn' ? 'bg-skyrim-gold/20 border-skyrim-gold text-skyrim-gold' : 'bg-black/30 border-skyrim-border text-gray-400'}`}>
                  <Home size={16} />
                  <div className="text-[10px] mt-1">Inn</div>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-gray-300 mb-1"><span>Duration</span><span className="flex items-center gap-1"><Clock size={12} /> {hours}h</span></div>
                <input type="range" min={1} max={12} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1h</span><span>6h</span><span>12h</span></div>
              </div>

              <div className="p-2 bg-black/40 rounded text-sm">{restQuality.desc}</div>
            </div>

            <div className="flex gap-2">
              <button onClick={confirmRest} className="flex-1 px-4 py-3 bg-green-700 text-white rounded font-bold">Confirm Rest</button>
              <button onClick={() => { onClose(); }} className="px-4 py-3 bg-gray-700 text-white rounded">Cancel</button>
            </div>

            <div className="text-xs text-gray-400">Note: your pre-rest changes are reversible until you click Apply Changes or Confirm Rest.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonfireMenu;
