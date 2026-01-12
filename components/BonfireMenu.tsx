import React, { useState, useMemo } from 'react';
import { X, Moon, TreePine, Tent, Home, Clock, Coins } from 'lucide-react';
import { InventoryItem, EquipmentSlot, Character } from '../types';
import { EquipmentHUD, getDefaultSlotForItem } from './EquipmentHUD';
import type { RestOptions } from './SurvivalModals';
import { useAppContext } from '../AppContext';
import PerkTreeModal from './PerkTreeModal';

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
  characterId?: string | null; // optional for per-character loadouts
  character?: any | null; // optional character object for Perk modal
  onApplyPerks?: (perkIds: string[]) => void;
}

export const BonfireMenu: React.FC<BonfireMenuProps> = ({ open, onClose, onConfirmRest, onApplyChanges, inventory, gold, hasCampingGear, hasBedroll, previewOptions, characterId, character, onApplyPerks }) => {
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

  const [slotPicker, setSlotPicker] = useState<EquipmentSlot | null>(null);

  const equipItem = (item: InventoryItem, slot?: EquipmentSlot) => {
    setLocalInventory(prev => prev.map(it => {
      if (it.id === item.id) return { ...it, equipped: true, slot };
      if (it.equipped && it.slot === slot && it.id !== item.id) return { ...it, equipped: false, slot: undefined };
      return it;
    }));
    setSlotPicker(null);
  };

  const unequipItem = (item: InventoryItem) => {
    setLocalInventory(prev => prev.map(it => it.id === item.id ? { ...it, equipped: false, slot: undefined } : it));
  };

  const getCandidatesForSlot = (slot: EquipmentSlot) => {
    return localInventory.filter(it => (it.type === 'weapon' || it.type === 'apparel') && (getDefaultSlotForItem(it) === slot || it.slot === slot));
  };

  const changedItems = useMemo(() => {
    const originalById = new Map<string, InventoryItem>(inventory.map(i => [i.id, i]));
    return localInventory.filter(it => {
      const orig = originalById.get(it.id);
      if (!orig) return true;
      return (orig.equipped !== it.equipped) || (orig.slot !== it.slot);
    });
  }, [inventory, localInventory]);

  // Loadout storage helpers (per-character, stored in localStorage)
  const loadoutKey = (name?: string) => `aetherius:bonfire:loadouts:${characterId || 'global'}`;

  const getSavedLoadouts = (): Array<{ name: string; mapping: Record<string, { slot?: EquipmentSlot }>}> => {
    try { return JSON.parse(localStorage.getItem(loadoutKey()) || '[]'); } catch (e) { return []; }
  };

  const saveLoadout = (name: string) => {
    const mapping: Record<string, { slot?: EquipmentSlot }> = {};
    localInventory.forEach(it => { if (it.equipped) mapping[it.id] = { slot: it.slot }; });
    const list = getSavedLoadouts();
    list.push({ name, mapping });
    localStorage.setItem(loadoutKey(), JSON.stringify(list));
    showSimpleToast('Loadout saved.');
  };

  const applyLoadout = (idx: number) => {
    const list = getSavedLoadouts();
    const picked = list[idx];
    if (!picked) return;
    const m = picked.mapping;
    setLocalInventory(prev => prev.map(it => ({ ...it, equipped: !!m[it.id], slot: m[it.id]?.slot })));
    showSimpleToast(`Applied loadout: ${picked.name}`);
  };

  const removeLoadout = (idx: number) => {
    const list = getSavedLoadouts();
    const picked = list[idx];
    if (!picked) return;
    // confirm deletion
    if (!confirm(`Delete loadout "${picked.name}"?`)) return;
    list.splice(idx, 1);
    localStorage.setItem(loadoutKey(), JSON.stringify(list));
    showSimpleToast('Loadout removed.');
  };

  const applyChanges = () => {
    if (changedItems.length === 0) return;
    onApplyChanges(changedItems);
  };

  const visibleLoadouts = useMemo(() => getSavedLoadouts(), [open, characterId, localInventory]);

  const confirmRest = () => {
    applyChanges();
    const options: RestOptions = { type: restType, hours, innCost: restType === 'inn' ? 10 : undefined };
    onConfirmRest(options);
    onClose();
  };

  // Small helper to show a toast using AppContext where available
  const appCtx = useAppContext();
  const showSimpleToast = (msg: string) => {
    try {
      appCtx?.showToast?.(msg, 'success');
    } catch (e) {
      try { (window as any).app?.showToast?.(msg, 'success'); } catch (e) { /* ignore */ }
    }
  };

  // Perk modal state (for quick staging inside bonfire)
  const [showPerkModal, setShowPerkModal] = useState(false);


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
              <EquipmentHUD items={localInventory} onUnequip={unequipItem} onEquipFromSlot={(slot) => setSlotPicker(slot)} />
            </div>

            {/* Slot picker: show candidates to equip for a selected slot */}
            {slotPicker && (
              <div className="mt-2 p-2 border border-skyrim-border rounded bg-black/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">Equip to: <span className="font-bold">{slotPicker}</span></div>
                  <button onClick={() => setSlotPicker(null)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getCandidatesForSlot(slotPicker).length === 0 ? (
                    <div className="text-xs text-gray-500">No equippable items for this slot.</div>
                  ) : (
                    getCandidatesForSlot(slotPicker).map(it => (
                      <div key={it.id} className="flex items-center justify-between p-2 bg-black/30 border border-skyrim-border rounded">
                        <div>
                          <div className="text-sm text-gray-200">{it.name}</div>
                          <div className="text-xs text-gray-500">x{it.quantity}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => equipItem(it, slotPicker)} className="px-2 py-1 text-xs bg-skyrim-gold text-skyrim-dark rounded">Equip</button>
                          {it.equipped && <button onClick={() => unequipItem(it)} className="px-2 py-1 text-xs bg-gray-700 text-white rounded">Unequip</button>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

        {/* Consumables list */}
        <div className="mt-3 p-2 bg-black/10 border border-skyrim-border rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-300">Consumables</div>
            <div className="text-xs text-gray-500">Use items to heal or buff before resting</div>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {localInventory.filter(i => (i.type === 'food' || i.type === 'potion' || i.type === 'drink') && (i.quantity || 0) > 0).length === 0 ? (
              <div className="text-xs text-gray-500">No consumables available.</div>
            ) : (
              localInventory.filter(i => (i.type === 'food' || i.type === 'potion' || i.type === 'drink') && (i.quantity || 0) > 0).map(it => (
                <div key={it.id} className="flex items-center justify-between p-2 bg-black/30 border border-skyrim-border rounded">
                  <div>
                    <div className="text-sm text-gray-200">{it.name}</div>
                    <div className="text-xs text-gray-500">x{it.quantity}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { if (it.type === 'food') { appCtx?.handleEatItem?.(it); setLocalInventory(prev => prev.map(p => p.id === it.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p)); } else if (it.type === 'drink') { appCtx?.handleDrinkItem?.(it); setLocalInventory(prev => prev.map(p => p.id === it.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p)); } else { appCtx?.handleUseItem?.(it); setLocalInventory(prev => prev.map(p => p.id === it.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p)); } }} className="px-2 py-1 text-xs bg-green-700 text-white rounded">Use</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
              <button onClick={() => setShowPerkModal(true)} className="px-4 py-3 bg-blue-700 text-white rounded">Perk Planner</button>
              <button onClick={() => { onClose(); }} className="px-4 py-3 bg-gray-700 text-white rounded">Cancel</button>
            </div>

            <div className="text-xs text-gray-400">Note: your pre-rest changes are reversible until you click Apply Changes or Confirm Rest.</div>

            {/* Perk planner modal (staged perks before/after rest) */}
            {showPerkModal && (
              <PerkTreeModal
                open={showPerkModal}
                onClose={() => setShowPerkModal(false)}
                character={character as any}
                onConfirm={(perkIds: string[]) => {
                  if (onApplyPerks) onApplyPerks(perkIds);
                  setShowPerkModal(false);
                  showSimpleToast('Perks applied.');
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BonfireMenu;
