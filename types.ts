
export interface UserProfile {
  id: string;
  username: string;
  created: number;
}

export interface Stats {
  health: number;
  magicka: number;
  stamina: number;
}

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
}

export interface SurvivalNeeds {
  hunger: number; // 0 = satisfied, 100 = starving
  thirst: number; // 0 = hydrated, 100 = dehydrated
  fatigue: number; // 0 = rested, 100 = exhausted
}

export interface Skill {
  name: string;
  level: number;
}

export interface Perk {
  id: string;
  name: string;
  skill: string;
  rank: number;
  description: string;
}

export interface Milestone {
  id: string;
  level: number;
  description: string;
  achieved: boolean;
}

export interface Character {
  id: string;
  profileId: string;
  name: string;
  race: string;
  gender: string; // Added gender
  archetype: string;
  profileImage?: string; // Profile photo URL
  isDead?: boolean; // Mark character as dead (cannot be played)
  deathDate?: string; // When the character died (narrative)
  deathCause?: string; // How the character died
  
  // Progression
  level: number;
  experience: number; // Current level progress or total XP
  gold: number;
  perks: Perk[];

  // Stats
  stats: Stats;
  skills: Skill[];

  // Survival & Time
  time: GameTime;
  needs: SurvivalNeeds;

  // Identity & Psychology
  identity: string;
  psychology: string;
  breakingPoint: string;
  moralCode: string;
  
  // Constraints
  allowedActions: string;
  forbiddenActions: string;
  
  // Weaknesses & Strengths
  fears: string;
  weaknesses: string;
  talents: string;
  magicApproach: string;
  
  // Worldview
  factionAllegiance: string;
  worldview: string;
  daedricPerception: string;
  
  // Evolution
  forcedBehavior: string;
  longTermEvolution: string;
  milestones: Milestone[];
  
  // Narrative
  backstory: string;
  lastPlayed: number;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  name: string;
  type: 'weapon' | 'apparel' | 'potion' | 'ingredient' | 'misc' | 'key';
  description: string;
  quantity: number;
  equipped: boolean;
}

export interface QuestStep {
  id: string;
  description: string;
  completed: boolean;
}

export interface CustomQuest {
  id: string;
  characterId: string;
  title: string;
  description: string;
  objectives: QuestStep[];
  status: 'active' | 'completed' | 'failed';
  location?: string;
  dueDate?: string; // New field
  createdAt: number;
  completedAt?: number;
}

export interface StoryChapter {
  id: string;
  characterId: string;
  title: string;
  content: string; // The narrative text
  date: string; // Skyrim date
  summary: string; // Short summary for context
  imageUrl?: string;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  characterId: string;
  date: string;
  title: string;
  content: string;
}

// Complex object for AI generation
export interface GeneratedCharacterData extends Partial<Character> {
  inventory?: Array<{ name: string; type: string; description: string; quantity: number }>;
  quests?: Array<{ title: string; description: string; location: string; dueDate?: string }>;
  journalEntries?: Array<{ title: string; content: string }>;
  openingStory?: { title: string; content: string };
  startingGold?: number;
}

// Initial defaults
export const DEFAULT_STATS: Stats = { health: 100, magicka: 100, stamina: 100 };

export const SKYRIM_SKILLS: Skill[] = [
  // Warrior
  { name: 'Smithing', level: 15 },
  { name: 'Heavy Armor', level: 15 },
  { name: 'Block', level: 15 },
  { name: 'Two-Handed', level: 15 },
  { name: 'One-Handed', level: 15 },
  { name: 'Archery', level: 15 },
  // Thief
  { name: 'Light Armor', level: 15 },
  { name: 'Sneak', level: 15 },
  { name: 'Lockpicking', level: 15 },
  { name: 'Pickpocket', level: 15 },
  { name: 'Speech', level: 15 },
  { name: 'Alchemy', level: 15 },
  // Mage
  { name: 'Illusion', level: 15 },
  { name: 'Conjuration', level: 15 },
  { name: 'Destruction', level: 15 },
  { name: 'Restoration', level: 15 },
  { name: 'Alteration', level: 15 },
  { name: 'Enchanting', level: 15 },
];

export const INITIAL_CHARACTER_TEMPLATE: Omit<Character, 'id' | 'profileId' | 'name' | 'race' | 'gender' | 'archetype' | 'lastPlayed'> = {
  level: 1,
  experience: 0,
  gold: 0,
  perks: [],
  stats: DEFAULT_STATS,
  skills: SKYRIM_SKILLS,

  time: { day: 1, hour: 8, minute: 0 },
  needs: { hunger: 0, thirst: 0, fatigue: 0 },

  identity: "",
  psychology: "",
  breakingPoint: "",
  moralCode: "",
  allowedActions: "",
  forbiddenActions: "",
  fears: "",
  weaknesses: "",
  talents: "",
  magicApproach: "",
  factionAllegiance: "",
  worldview: "",
  daedricPerception: "",
  forcedBehavior: "",
  longTermEvolution: "",
  milestones: [],
  backstory: ""
};

export const SKYRIM_RACES = [
  "Altmer (High Elf)",
  "Argonian",
  "Bosmer (Wood Elf)",
  "Breton",
  "Dunmer (Dark Elf)",
  "Imperial",
  "Khajiit",
  "Nord",
  "Orc (Orsimer)",
  "Redguard"
];

// AI Action Types
export interface GameStateUpdate {
  narrative?: { title: string; content: string };
  newQuests?: Array<{
    title: string;
    description: string;
    location?: string;
    dueDate?: string;
    objectives?: Array<{ description: string; completed?: boolean }>;
  }>;
  updateQuests?: Array<{ title: string; status: 'completed' | 'failed' | 'active' }>;
  newItems?: Array<{ name: string; type: string; description: string; quantity: number }>;
  removedItems?: Array<{ name: string; quantity: number }>;
  statUpdates?: Partial<Stats>;
  goldChange?: number;
  xpChange?: number;

  // Progression / survival
  timeAdvanceMinutes?: number;
  needsChange?: Partial<SurvivalNeeds>;

  // Dialogue choices to present as clickable options
  choices?: Array<{ label: string; playerText: string }>;

  // Character detail updates (hero sheet fields)
  characterUpdates?: {
    identity?: string;
    psychology?: string;
    breakingPoint?: string;
    moralCode?: string;
    allowedActions?: string;
    forbiddenActions?: string;
    fears?: string;
    weaknesses?: string;
    talents?: string;
    magicApproach?: string;
    factionAllegiance?: string;
    worldview?: string;
    daedricPerception?: string;
    forcedBehavior?: string;
    longTermEvolution?: string;
    backstory?: string;
  };
}
