import { Perk } from '../types';

export interface PerkDef {
  id: string;
  name: string;
  skill?: string;
  description: string;
  requires?: string[]; // ids of prerequisite perks
  effect?: { type: 'stat' | 'skill'; key: string; amount: number };
}

// Minimal sample tree to start
export const PERK_DEFINITIONS: PerkDef[] = [
  { id: 'toughness', name: 'Toughness', skill: 'Health', description: 'Increase max health by 10.', effect: { type: 'stat', key: 'health', amount: 10 } },
  { id: 'vitality', name: 'Vitality', skill: 'Health', description: 'Increase max health by 20.', requires: ['toughness'], effect: { type: 'stat', key: 'health', amount: 20 } },
  { id: 'arcane_focus', name: 'Arcane Focus', skill: 'Magicka', description: 'Increase max magicka by 10.', effect: { type: 'stat', key: 'magicka', amount: 10 } },
  { id: 'mana_mastery', name: 'Mana Mastery', skill: 'Magicka', description: 'Increase max magicka by 20.', requires: ['arcane_focus'], effect: { type: 'stat', key: 'magicka', amount: 20 } },
  { id: 'endurance', name: 'Endurance', skill: 'Stamina', description: 'Increase max stamina by 10.', effect: { type: 'stat', key: 'stamina', amount: 10 } },
  { id: 'fleet_foot', name: 'Fleet Foot', skill: 'Stamina', description: 'Increase max stamina by 15.', requires: ['endurance'], effect: { type: 'stat', key: 'stamina', amount: 15 } },
];

export default PERK_DEFINITIONS;
