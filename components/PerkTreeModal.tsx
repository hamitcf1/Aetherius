import React, { useState, useMemo } from 'react';
import ModalWrapper from './ModalWrapper';
import { PERK_DEFINITIONS, PerkDef } from '../data/perkDefinitions';
import { Perk, Character } from '../types';
import { Check, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  character: Character;
  onConfirm: (perkIds: string[]) => void; // commit staged perks
}

function isUnlocked(char: Character, perkId: string) {
  return (char.perks || []).some(p => p.id === perkId);
}

function prerequisitesMet(char: Character, def: PerkDef) {
  if (!def.requires || def.requires.length === 0) return true;
  return def.requires.every(r => isUnlocked(char, r));
}

export default function PerkTreeModal({ open, onClose, character, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [staged, setStaged] = useState<string[]>([]); // staged unlocks (not yet committed)

  const defs = useMemo(() => PERK_DEFINITIONS, []);

  const availablePoints = character.perkPoints || 0;
  const stagedCount = staged.length;
  const remainingPoints = Math.max(0, availablePoints - stagedCount);

  const statusOf = (def: PerkDef) => {
    if (isUnlocked(character, def.id)) return 'unlocked';
    if (prerequisitesMet(character, def)) return 'available';
    return 'locked';
  };

  return (
    <ModalWrapper open={open} onClose={onClose} preventOutsideClose>
      <div className="w-[760px] max-h-[80vh] overflow-auto bg-skyrim-paper p-6 rounded border border-skyrim-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-skyrim-gold">Perk Tree</h3>
          <div className="text-sm text-gray-300">Available Points: <span className="font-bold text-skyrim-gold">{availablePoints}</span></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {defs.map(def => {
            const st = statusOf(def);
            const isStaged = staged.includes(def.id);
            return (
              <div key={def.id} className={`p-3 rounded border transform transition-all duration-200 ${isStaged ? 'scale-105 ring-2 ring-skyrim-gold/30 shadow-lg' : ''} ${st === 'unlocked' ? 'border-green-600 bg-green-950/5' : st === 'available' ? 'border-skyrim-gold bg-skyrim-gold/5' : 'border-skyrim-border bg-black/20'}`}>
                <button onClick={() => setSelected(def.id)} className="w-full text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold">{def.name}</div>
                      <div className="text-xs text-gray-400">{def.skill || ''}</div>
                    </div>
                    <div className="ml-2">
                      {st === 'unlocked' && <Check className="text-green-400" />}
                      {st === 'locked' && <Lock className="text-gray-500" />}
                      {isStaged && <Check className="text-skyrim-gold" />}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-black/30 border border-skyrim-border rounded">
          {selected ? (
            (() => {
              const def = defs.find(d => d.id === selected)!;
              const st = statusOf(def);
              const isStaged = staged.includes(def.id);
              const canStage = st === 'available' && remainingPoints > 0 && !isStaged;
              return (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-skyrim-gold font-bold">{def.name}</div>
                      <div className="text-xs text-gray-400">{def.skill}</div>
                    </div>
                    <div className="text-sm text-gray-300">Status: <span className={`font-bold ${st === 'unlocked' ? 'text-green-400' : st === 'available' ? 'text-skyrim-gold' : 'text-gray-400'}`}>{st}</span></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-300">{def.description}</p>
                  <div className="mt-4 flex gap-2">
                    <button disabled={!canStage} onClick={() => {
                      if (!canStage) return;
                      setStaged(s => [...s, def.id]);
                    }} className={`px-3 py-2 rounded ${canStage ? 'bg-skyrim-gold text-black' : 'bg-black/20 text-gray-400 border border-skyrim-border'}`}>{isStaged ? 'Staged' : 'Stage Unlock'}</button>
                    <button disabled={!isStaged} onClick={() => setStaged(s => s.filter(x => x !== def.id))} className={`px-3 py-2 rounded ${isStaged ? 'border border-skyrim-gold text-skyrim-gold' : 'bg-black/20 text-gray-400 border border-skyrim-border'}`}>Undo</button>
                    <button onClick={() => setSelected(null)} className="px-3 py-2 rounded border border-skyrim-border">Close</button>
                  </div>
                  {st === 'locked' && def.requires && (
                    <div className="mt-3 text-xs text-gray-400">Requires: {def.requires.map(r => <span key={r} className="px-1 py-0.5 bg-black/20 rounded mr-1">{r}</span>)}</div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-gray-400">Select a perk to view details.</div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-300">Staged: <span className="text-skyrim-gold font-bold">{stagedCount}</span> / {availablePoints}</div>
          <div className="flex gap-2">
            <button onClick={() => { setStaged([]); setSelected(null); onClose(); }} className="px-4 py-2 rounded border border-skyrim-border">Cancel</button>
            <button disabled={stagedCount === 0} onClick={() => { onConfirm(staged); setStaged([]); setSelected(null); }} className={`px-4 py-2 rounded ${stagedCount>0 ? 'bg-skyrim-gold text-black' : 'bg-black/20 text-gray-400 border border-skyrim-border'}`}>Confirm Unlocks</button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
