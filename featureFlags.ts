/**
 * Feature Flags Configuration
 * 
 * Toggle features on/off easily during development.
 * Set to `false` to disable a feature, `true` to enable.
 * 
 * Features marked as WIP will show a badge in the UI.
 */

export interface FeatureFlag {
  enabled: boolean;
  wip?: boolean; // Show "Work in Progress" badge
  label?: string; // Display label for WIP badge
}

export const FEATURES = {
  // === CORE FEATURES ===
  shop: { enabled: true, wip: false },
  survival: { enabled: true, wip: false },
  adventure: { enabled: true, wip: false },
  story: { enabled: true, wip: false },
  journal: { enabled: true, wip: false },
  quests: { enabled: true, wip: false },
  inventory: { enabled: true, wip: false },

  // === PROGRESSION ===
  timeProgression: { enabled: true, wip: false },
  needsSystem: { enabled: true, wip: false },
  restSystem: { enabled: true, wip: false },
  campingGear: { enabled: true, wip: false },

  // === AI FEATURES ===
  aiScribe: { enabled: true, wip: false },
  aiCharacterGeneration: { enabled: true, wip: false },
  aiProfileImage: { enabled: true, wip: true, label: 'Beta' },
  gemmaModels: { enabled: true, wip: false },

  // === CHARACTER MANAGEMENT ===
  characterDeath: { enabled: true, wip: false },
  profileDeletion: { enabled: true, wip: false },
  characterDeletion: { enabled: true, wip: false },
  
  // === UI/UX ===
  onboarding: { enabled: true, wip: false },
  snowEffect: { enabled: true, wip: false },
  exportPDF: { enabled: false, wip: true, label: 'Coming Soon' },
  photoUpload: { enabled: false, wip: true, label: 'Coming Soon' },

  // === EXPERIMENTAL ===
  multiplayerPresence: { enabled: false, wip: true, label: 'Experimental' },
} as const satisfies Record<string, FeatureFlag>;

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature]?.enabled ?? false;
};

// Helper to check if a feature is WIP
export const isFeatureWIP = (feature: keyof typeof FEATURES): boolean => {
  return FEATURES[feature]?.wip ?? false;
};

// Helper to get WIP label
export const getFeatureLabel = (feature: keyof typeof FEATURES): string | undefined => {
  const f = FEATURES[feature] as FeatureFlag;
  return f?.label;
};

// Type for feature keys
export type FeatureKey = keyof typeof FEATURES;
