import React, { useState, useEffect } from 'react';
import { 
    INITIAL_CHARACTER_TEMPLATE, Character, CustomQuest, JournalEntry, UserProfile, InventoryItem, StoryChapter, GameStateUpdate, GeneratedCharacterData 
} from './types';
import { CharacterSheet } from './components/CharacterSheet';
import ActionBar, { ActionBarToggle } from './components/ActionBar';
import { AppContext } from './AppContext';
import { QuestLog } from './components/QuestLog';
import { Journal } from './components/Journal';
import { Inventory } from './components/Inventory';
import { StoryLog } from './components/StoryLog';
import { AIScribe } from './components/AIScribe';
import { AdventureChat } from './components/AdventureChat';
import { CharacterSelect } from './components/CharacterSelect';
import { OnboardingModal } from './components/OnboardingModal';
import UpdateNotification from './components/UpdateNotification';
import { User, Scroll, BookOpen, Skull, Package, Feather, LogOut, Users, Loader, Save, Swords } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { setCurrentUser as setFeatureFlagUser } from './featureFlags';
import { 
  auth,
  onAuthChange, 
  registerUser, 
  loginUser, 
  loginAnonymously,
  logoutUser,
  sendPasswordReset
} from './services/firebase';
import { 
  initializeFirestoreDb,
  loadCharacters,
  loadInventoryItems,
  loadQuests,
  loadJournalEntries,
  loadStoryChapters,
  loadUserProfiles,
  loadUserSettings,
  saveUserSettings,
  saveCharacter,
  saveInventoryItem,
  deleteInventoryItem,
  saveQuest,
  saveJournalEntry,
  saveStoryChapter,
  saveUserProfile,
  deleteCharacter,
  batchSaveGameState,
  saveUserMetadata,
  removeDuplicateItems,
  deleteItemByName,
  
} from './services/firestore';
import {
  setUserOnline,
  setUserOffline,
  setActiveCharacter,
  clearActiveCharacter
} from './services/realtime';
import { getFoodNutrition, getDrinkNutrition } from './services/nutritionData';
import { getItemStats, shouldHaveStats } from './services/itemStats';
import { updateMusicForContext, AmbientContext, audioService, playMusic } from './services/audioService';
import type { PreferredAIModel } from './services/geminiService';
import type { UserSettings } from './services/firestore';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Skyrim Calendar System - Accurate representation
// Each month has ~30 days, 12 months per year
// The game starts on 17th of Last Seed (August), 4E 201
const SKYRIM_MONTHS = [
  { name: "Morning Star", days: 31 },   // January
  { name: "Sun's Dawn", days: 28 },     // February
  { name: "First Seed", days: 31 },     // March
  { name: "Rain's Hand", days: 30 },    // April
  { name: "Second Seed", days: 31 },    // May
  { name: "Mid Year", days: 30 },       // June
  { name: "Sun's Height", days: 31 },   // July
  { name: "Last Seed", days: 31 },      // August
  { name: "Hearthfire", days: 30 },     // September
  { name: "Frostfall", days: 31 },      // October
  { name: "Sun's Dusk", days: 30 },     // November
  { name: "Evening Star", days: 31 },   // December
];

// Calculate Skyrim date from day number (starting from Day 1 = 17th Last Seed, 4E 201)
const getSkyrimCalendarDate = (dayNumber: number): { era: string; year: number; month: string; day: number; monthIndex: number } => {
  // Day 1 = 17th of Last Seed (month index 7), 4E 201
  const startingDay = 17;
  const startingMonthIndex = 7; // Last Seed
  const startingYear = 201;
  const era = "4E";
  
  // Total days since beginning of year (Last Seed 1st would be day 213 of year)
  // Days before Last Seed: 31+28+31+30+31+30+31 = 212
  const daysBeforeLastSeed = SKYRIM_MONTHS.slice(0, startingMonthIndex).reduce((sum, m) => sum + m.days, 0);
  const startingDayOfYear = daysBeforeLastSeed + startingDay; // ~229
  
  // Calculate total days elapsed since start of year 201
  let totalDays = startingDayOfYear + (dayNumber - 1);
  let year = startingYear;
  
  // Handle year overflow
  const daysPerYear = SKYRIM_MONTHS.reduce((sum, m) => sum + m.days, 0); // 365
  while (totalDays > daysPerYear) {
    totalDays -= daysPerYear;
    year++;
  }
  
  // Find month and day
  let remaining = totalDays;
  let monthIndex = 0;
  for (let i = 0; i < SKYRIM_MONTHS.length; i++) {
    if (remaining <= SKYRIM_MONTHS[i].days) {
      monthIndex = i;
      break;
    }
    remaining -= SKYRIM_MONTHS[i].days;
  }
  
  const day = Math.max(1, remaining);
  
  return {
    era,
    year,
    month: SKYRIM_MONTHS[monthIndex].name,
    day,
    monthIndex
  };
};

// Format with ordinal suffix
const getOrdinalSuffix = (n: number): string => {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

// Format full Skyrim date string
const formatSkyrimDate = (dayNumber: number): string => {
  const date = getSkyrimCalendarDate(dayNumber);
  return `${date.day}${getOrdinalSuffix(date.day)} of ${date.month}, ${date.era} ${date.year}`;
};

// Short format for display
const formatSkyrimDateShort = (dayNumber: number): string => {
  const date = getSkyrimCalendarDate(dayNumber);
  return `${date.month} ${date.day}, ${date.era} ${date.year}`;
};

// Tunable passive need rates (per in-game minute). Lower = slower.
// Example: hungerPerMinute = 1/180 means +1 hunger every 180 minutes (~3 hours).
const NEED_RATES = {
  hungerPerMinute: 1 / 180,
  thirstPerMinute: 1 / 120,
  fatiguePerMinute: 1 / 90,
} as const;

const calcNeedFromTime = (minutes: number, perMinute: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const raw = minutes * perMinute;
  // Keep it readable and stable.
  return Math.round(raw * 10) / 10;
};

const addMinutesToTime = (time: { day: number; hour: number; minute: number }, minutesToAdd: number) => {
  const safe = {
    day: Math.max(1, Number(time?.day || 1)),
    hour: clamp(Number(time?.hour || 0), 0, 23),
    minute: clamp(Number(time?.minute || 0), 0, 59)
  };
  const total = safe.hour * 60 + safe.minute + Math.trunc(minutesToAdd || 0);
  let dayDelta = Math.floor(total / (24 * 60));
  let remainder = total % (24 * 60);
  if (remainder < 0) {
    remainder += 24 * 60;
    dayDelta -= 1;
  }
  const hour = Math.floor(remainder / 60);
  const minute = remainder % 60;
  return {
    day: Math.max(1, safe.day + dayDelta),
    hour,
    minute,
  };
};

const formatTime = (time: { day: number; hour: number; minute: number }) => {
  const d = Math.max(1, Number(time?.day || 1));
  const h = clamp(Number(time?.hour || 0), 0, 23);
  const m = clamp(Number(time?.minute || 0), 0, 59);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Export calendar utilities for use in other components
export { getSkyrimCalendarDate, formatSkyrimDate, formatSkyrimDateShort, getOrdinalSuffix, SKYRIM_MONTHS };

const TABS = {
  CHARACTER: 'character',
  INVENTORY: 'inventory',
  QUESTS: 'quests',
  STORY: 'story',
  JOURNAL: 'journal',
  ADVENTURE: 'adventure'
};

interface AppGameState {
  profiles: UserProfile[];
  characters: Character[];
  items: InventoryItem[];
  quests: CustomQuest[];
  journalEntries: JournalEntry[];
  storyChapters: StoryChapter[];
}

const App: React.FC = () => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Global State (in-memory)
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quests, setQuests] = useState<CustomQuest[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [storyChapters, setStoryChapters] = useState<StoryChapter[]>([]);

  // Onboarding (shown to new users)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Dirty state tracking for debounced saves
  const [dirtyEntities, setDirtyEntities] = useState<Set<string>>(new Set());

  // Session State
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(TABS.CHARACTER);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Persist currentCharacterId to localStorage
  useEffect(() => {
    if (currentUser?.uid && currentCharacterId) {
      try {
        localStorage.setItem(`aetherius:lastCharacter:${currentUser.uid}`, currentCharacterId);
      } catch { /* ignore */ }
    }
  }, [currentUser?.uid, currentCharacterId]);

  // Persist activeTab to localStorage
  useEffect(() => {
    if (currentUser?.uid && currentCharacterId) {
      try {
        localStorage.setItem(`aetherius:lastTab:${currentUser.uid}`, activeTab);
      } catch { /* ignore */ }
    }
  }, [currentUser?.uid, currentCharacterId, activeTab]);

  // AI Model Selection (global)
  const [aiModel, setAiModel] = useState<PreferredAIModel>('gemma-3-27b-it');

  // Expose database utilities for console access (for admin/debug purposes)
  useEffect(() => {
    if (currentUser?.uid) {
      (window as any).aetheriusUtils = {
        userId: currentUser.uid,
        characterId: currentCharacterId,
        removeDuplicateItems: () => removeDuplicateItems(currentUser.uid, currentCharacterId || undefined),
        deleteItemByName: (name: string) => deleteItemByName(currentUser.uid, name, currentCharacterId || undefined),
        reloadItems: async () => {
          const userItems = await loadInventoryItems(currentUser.uid);
          setItems(userItems);
          return userItems;
        }
      };
      console.log('🔧 Database utils available via window.aetheriusUtils');
      console.log('  - removeDuplicateItems() - removes items with duplicate names');
      console.log('  - deleteItemByName("lockpicks") - deletes all items with that name');
      console.log('  - reloadItems() - reloads inventory from database');
    }
  }, [currentUser?.uid, currentCharacterId]);

  useEffect(() => {
    const key = currentUser?.uid ? `aetherius:aiModel:${currentUser.uid}` : 'aetherius:aiModel';
    try {
      const raw = localStorage.getItem(key);
      if (raw) setAiModel(raw as PreferredAIModel);
    } catch {
      // ignore
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    const key = currentUser?.uid ? `aetherius:aiModel:${currentUser.uid}` : 'aetherius:aiModel';
    try {
      localStorage.setItem(key, aiModel);
    } catch {
      // ignore
    }
  }, [aiModel, currentUser?.uid]);

  // Firebase Authentication Listener + Firestore Data Loading
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setCurrentUser(user);
      // Update feature flags with current user for admin checks
      setFeatureFlagUser(user?.uid || null);
      
      if (user) {
        try {
          // Initialize Firestore (must happen before any queries)
          console.log('Initializing Firestore for user:', user.uid);
          await initializeFirestoreDb();

          // Set user online status in Realtime DB
          await setUserOnline(user.uid);

          // Load all data from Firestore in parallel
          console.log('Loading user data from Firestore...');
          const [userProfiles, userCharacters, userItems, userQuests, userEntries, userChapters, settings] = await Promise.all([
            loadUserProfiles(user.uid),
            loadCharacters(user.uid),
            loadInventoryItems(user.uid),
            loadQuests(user.uid),
            loadJournalEntries(user.uid),
            loadStoryChapters(user.uid),
            loadUserSettings(user.uid)
          ]);

          console.log('Data loaded successfully:', { userProfiles, userCharacters, userItems });
          // Ensure there is always at least one profile so we can go straight to character selection.
          // Profiles remain as an internal grouping, but we no longer show a profile selection screen.
          let nextProfiles = userProfiles || [];
          if (nextProfiles.length === 0) {
            const derivedName = (user.email || '').split('@')[0]?.trim() || 'Player';
            const defaultProfile: UserProfile = { id: uniqueId(), username: derivedName, created: Date.now() };
            nextProfiles = [defaultProfile];
            try {
              await saveUserProfile(user.uid, defaultProfile);
            } catch (e) {
              console.warn('Failed to auto-create default profile (non-critical):', e);
              setDirtyEntities(prev => new Set([...prev, defaultProfile.id]));
            }
          }
          setProfiles(nextProfiles);
          setCurrentProfileId(nextProfiles[0]?.id ?? null);

          // Decide whether to show onboarding for this user.
          try {
            const key = `aetherius:onboardingCompleted:${user.uid}`;
            const localDone = localStorage.getItem(key) === '1';
            const remoteDone = settings?.onboardingCompleted === true;
            const isNewAccount = (userProfiles?.length || 0) === 0 && (userCharacters?.length || 0) === 0;
            setUserSettings(settings);
            setOnboardingOpen(isNewAccount && !localDone && !remoteDone);
          } catch {
            const remoteDone = settings?.onboardingCompleted === true;
            const isNewAccount = (userProfiles?.length || 0) === 0 && (userCharacters?.length || 0) === 0;
            setUserSettings(settings);
            setOnboardingOpen(isNewAccount && !remoteDone);
          }

          // Normalize older saves to include new survival/time fields
          const normalizedCharacters = (userCharacters || []).map((c: any) => {
            const time = c?.time && typeof c.time === 'object' ? c.time : INITIAL_CHARACTER_TEMPLATE.time;
            const needs = c?.needs && typeof c.needs === 'object' ? c.needs : INITIAL_CHARACTER_TEMPLATE.needs;
            const next: Character = {
              ...c,
              time: {
                day: Math.max(1, Number(time?.day || 1)),
                hour: clamp(Number(time?.hour || 0), 0, 23),
                minute: clamp(Number(time?.minute || 0), 0, 59),
              },
              needs: {
                hunger: clamp(Number(needs?.hunger ?? 0), 0, 100),
                thirst: clamp(Number(needs?.thirst ?? 0), 0, 100),
                fatigue: clamp(Number(needs?.fatigue ?? 0), 0, 100),
              },
            };
            if (!c?.time || !c?.needs) {
              setDirtyEntities(prev => new Set([...prev, next.id]));
            }
            return next;
          });
          setCharacters(normalizedCharacters);
          setItems(userItems);
          setQuests(userQuests);
          setJournalEntries(userEntries);
          setStoryChapters(userChapters);
          
          // Restore last selected character and tab from localStorage
          // BUT only if this is a page refresh, not a fresh login
          try {
            const isFreshLogin = sessionStorage.getItem('aetherius:freshLogin') === '1';
            
            // Clear the fresh login marker after checking
            if (isFreshLogin) {
              sessionStorage.removeItem('aetherius:freshLogin');
            }
            
            // Only restore character on page refresh, not on fresh login
            if (!isFreshLogin) {
              const lastCharId = localStorage.getItem(`aetherius:lastCharacter:${user.uid}`);
              const lastTab = localStorage.getItem(`aetherius:lastTab:${user.uid}`);
              
              // Only restore if the character still exists
              if (lastCharId && normalizedCharacters.some((c: Character) => c.id === lastCharId)) {
                setCurrentCharacterId(lastCharId);
                if (lastTab && Object.values(TABS).includes(lastTab)) {
                  setActiveTab(lastTab);
                }
              }
            }
          } catch { /* ignore localStorage errors */ }
        } catch (error) {
          console.error('Error initializing or loading user data:', error);
          setAuthError('Failed to load data from Firestore. Check console for details.');
        } finally {
          setLoading(false);
        }
      } else {
        // User logged out - set offline and clear state
        if (currentUser?.uid) {
          try {
            await setUserOffline(currentUser.uid);
            await clearActiveCharacter(currentUser.uid);
          } catch (error) {
            console.warn('Error on logout:', error);
          }
        }
        
        setProfiles([]);
        setCharacters([]);
        setItems([]);
        setQuests([]);
        setJournalEntries([]);
        setStoryChapters([]);
        setCurrentProfileId(null);
        setCurrentCharacterId(null);
        setUserSettings(null);
        setOnboardingOpen(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize audio service on first user interaction
  useEffect(() => {
    const initAudio = () => {
      audioService.initialize();
      // Remove listener after first interaction
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Start music based on game state - defined later after activeCharacter is available
  // Music initialization is handled in a separate useEffect below after activeCharacter definition

  // Music initialization based on character selection
  useEffect(() => {
    const char = characters.find(c => c.id === currentCharacterId);
    if (currentCharacterId && char) {
      // Initialize audio if not already done
      audioService.initialize();
      
      // Determine initial music based on character's current state
      const hour = char.time?.hour ?? 12;
      const isNight = hour >= 20 || hour < 5;
      
      // Start with exploration or night music
      const initialTrack = isNight ? 'night' : 'exploration';
      playMusic(initialTrack, true);
      
      console.log(`🎵 Started ${initialTrack} music for ${char.name} (hour: ${hour})`);
    } else if (!currentCharacterId) {
      // Play main menu music when no character selected
      audioService.initialize();
      playMusic('main_menu', true);
      console.log('🎵 Playing main menu music');
    }
  }, [currentCharacterId, characters]);

  const completeOnboarding = async () => {
    if (!currentUser?.uid) {
      setOnboardingOpen(false);
      return;
    }

    const uid = currentUser.uid as string;
    setOnboardingOpen(false);

    try {
      localStorage.setItem(`aetherius:onboardingCompleted:${uid}`, '1');
    } catch {
      // ignore
    }

    const next: UserSettings = {
      ...(userSettings || {}),
      onboardingCompleted: true,
      onboardingVersion: userSettings?.onboardingVersion ?? 1,
      createdAt: userSettings?.createdAt,
    };
    setUserSettings(next);
    try {
      await saveUserSettings(uid, next);
    } catch (e) {
      console.warn('Failed to persist onboarding completion:', e);
    }
  };

  // Debounced Firestore saves for dirty entities
  useEffect(() => {
    if (!currentUser) return;
    
    const timer = setTimeout(async () => {
      if (dirtyEntities.size === 0) return;

      try {
        // Only save modified entities (debounced)
        for (const entityId of dirtyEntities) {
          // Try to match entityId to entity type and save accordingly
          const char = characters.find(c => c.id === entityId);
          if (char) {
            await saveCharacter(currentUser.uid, char);
            continue;
          }

          const item = items.find(i => i.id === entityId);
          if (item) {
            await saveInventoryItem(currentUser.uid, item);
            continue;
          }

          const quest = quests.find(q => q.id === entityId);
          if (quest) {
            await saveQuest(currentUser.uid, quest);
            continue;
          }

          const entry = journalEntries.find(e => e.id === entityId);
          if (entry) {
            await saveJournalEntry(currentUser.uid, entry);
            continue;
          }

          const chapter = storyChapters.find(s => s.id === entityId);
          if (chapter) {
            await saveStoryChapter(currentUser.uid, chapter);
            continue;
          }

          const profile = profiles.find(p => p.id === entityId);
          if (profile) {
            await saveUserProfile(currentUser.uid, profile);
          }
        }

        // Clear dirty state after successful save
        setDirtyEntities(new Set());
      } catch (error) {
        console.error('Debounced save error:', error);
      }
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [dirtyEntities, currentUser, characters, items, quests, journalEntries, storyChapters, profiles]);

  // Actions
  const handleUpdateCharacter = (characterId: string, newName: string) => {
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, name: newName } : c));
      setDirtyEntities(prev => new Set([...prev, characterId]));
  };

  // Delete a single character
  const handleDeleteCharacter = async (characterId: string) => {
    if (!currentUser) return;
    
    try {
      // Delete from Firestore (this will also delete related items, quests, journal, and story)
      await deleteCharacter(currentUser.uid, characterId);
      
      // Update local state - remove character and all related data
      setCharacters(prev => prev.filter(c => c.id !== characterId));
      setItems(prev => prev.filter(i => i.characterId !== characterId));
      setQuests(prev => prev.filter(q => q.characterId !== characterId));
      setJournalEntries(prev => prev.filter(j => j.characterId !== characterId));
      setStoryChapters(prev => prev.filter(s => s.characterId !== characterId));
      
      // Clear current selection if deleted
      if (currentCharacterId === characterId) {
        setCurrentCharacterId(null);
      }
    } catch (error) {
      console.error('Error deleting character:', error);
    }
  };

  // Mark character as dead or resurrect (deathCause = null means resurrect)
  const handleMarkCharacterDead = async (characterId: string, deathCause: string | null) => {
    if (!currentUser) return;
    
    const isDead = deathCause !== null;
    const updates: Partial<Character> = {
      isDead,
      deathDate: isDead ? new Date().toISOString() : undefined,
      deathCause: isDead ? deathCause : undefined
    };
    
    // Update local state
    setCharacters(prev => prev.map(c => 
      c.id === characterId 
        ? { ...c, ...updates }
        : c
    ));
    setDirtyEntities(prev => new Set([...prev, characterId]));
    
    // Save to Firestore
    try {
      const char = characters.find(c => c.id === characterId);
      if (char) {
        await saveCharacter(currentUser.uid, { ...char, ...updates });
      }
    } catch (error) {
      console.error('Error updating character death status:', error);
    }
  };

  // Manual Save Handler - Forces immediate Firestore flush
  const handleManualSave = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      // Batch save all data to Firestore
      await batchSaveGameState(
        currentUser.uid,
        characters,
        items,
        quests,
        journalEntries,
        storyChapters,
        profiles
      );
      
      setSaveMessage('✓ All data saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
      setDirtyEntities(new Set());
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage('✗ Error saving data');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  const handleRegister = async (email: string, password: string, username: string) => {
    setAuthError(null);
    try {
      if (!email || !password || !username) {
        setAuthError('Email, password, and username are required');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters');
        return;
      }
      const userCredential = await registerUser(email, password);

      // Create a default profile immediately so the next screen is character selection.
      try {
        await initializeFirestoreDb();
        const defaultProfile: UserProfile = { id: uniqueId(), username, created: Date.now() };
        await saveUserProfile(userCredential.user.uid, defaultProfile);
        setProfiles([defaultProfile]);
        setCurrentProfileId(defaultProfile.id);
      } catch (e) {
        console.warn('Failed to auto-create default profile on register (non-critical):', e);
      }
      
      // Save user metadata for easier tracking in database (non-blocking)
      saveUserMetadata({
        uid: userCredential.user.uid,
        email: email,
        username: username,
        createdAt: Date.now(),
        lastLogin: Date.now()
      }).catch(err => {
        console.warn('Failed to save user metadata (non-critical):', err);
      });
      setLoginEmail('');
      setLoginPassword('');
      setLoginUsername('');
      setAuthError(null);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('This email is already in use');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Invalid email address');
      } else {
        setAuthError('Registration failed: ' + error.message);
      }
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
      if (!email || !password) {
        setAuthError('Email and password are required');
        return;
      }
      // Mark this as a fresh login - don't auto-restore character
      sessionStorage.setItem('aetherius:freshLogin', '1');
      await loginUser(email, password);
      setLoginEmail('');
      setLoginPassword('');
      setAuthError(null);
    } catch (error: any) {
      // Remove fresh login marker on error
      sessionStorage.removeItem('aetherius:freshLogin');
      if (error.code === 'auth/user-not-found') {
        setAuthError('No user found');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Incorrect password');
      } else {
        setAuthError('Login failed: ' + error.message);
      }
    }
  };

  const handleGuestLogin = async () => {
    setAuthError(null);
    try {
      // Mark this as a fresh login - don't auto-restore character
      sessionStorage.setItem('aetherius:freshLogin', '1');
      await loginAnonymously();
      setAuthError(null);
    } catch (error: any) {
      sessionStorage.removeItem('aetherius:freshLogin');
      setAuthError('Guest login failed: ' + error.message);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthError(null);
    setResetEmailSent(false);
    try {
      if (!email) {
        setAuthError('Please enter your email address');
        return;
      }
      const result = await sendPasswordReset(email);
      if (result.success) {
        setResetEmailSent(true);
      } else {
        setAuthError(result.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      setAuthError('Failed to send reset email: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      if (currentUser) {
        await setUserOffline(currentUser.uid);
        await clearActiveCharacter(currentUser.uid);
      }
      await logoutUser();
      setCurrentProfileId(null);
      setCurrentCharacterId(null);
    } catch (error) {
      setAuthError('Logout failed');
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-skyrim-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-skyrim-gold" size={48} />
          <p className="text-skyrim-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Login/Register Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-skyrim-dark flex items-center justify-center p-4">
        <div className="bg-skyrim-paper rounded-lg shadow-2xl p-8 max-w-md w-full border border-skyrim-gold/30">
          <h1 className="text-4xl font-serif font-bold text-skyrim-gold text-center mb-8 tracking-widest">SKYRIM</h1>
          <p className="text-skyrim-text text-center mb-6">Welcome to Aetherius</p>
          
          {authError && (
            <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-4 text-red-200 text-sm">
              {authError}
            </div>
          )}
          
          {authMode === 'login' ? (
            // LOGIN FORM
            <div className="space-y-4">
              <input 
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(loginEmail, loginPassword)}
              />
              <input 
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(loginEmail, loginPassword)}
              />
              
              <button 
                onClick={() => handleLogin(loginEmail, loginPassword)}
                className="w-full bg-skyrim-gold text-skyrim-dark font-bold py-2 rounded hover:bg-yellow-400 transition-colors"
              >
                Login
              </button>

              <div className="relative flex items-center my-4">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-3 text-gray-500 text-sm">or</span>
                <div className="flex-grow border-t border-gray-600"></div>
              </div>

              <button 
                onClick={handleGuestLogin}
                className="w-full bg-gray-700 text-gray-200 font-bold py-2 rounded hover:bg-gray-600 transition-colors border border-gray-600"
              >
                🎮 Continue as Guest
              </button>
              <p className="text-gray-500 text-xs text-center">
                Guest data is saved but may be lost if you clear browser data
              </p>
              
              <div className="text-center space-y-2">
                <button
                  onClick={() => { setAuthMode('forgot'); setAuthError(null); setResetEmailSent(false); }}
                  className="text-gray-400 hover:text-skyrim-gold text-sm transition-colors"
                >
                  Forgot your password?
                </button>
                <div>
                  <button
                    onClick={() => { setAuthMode('register'); setAuthError(null); }}
                    className="text-skyrim-gold hover:text-yellow-400 text-sm transition-colors"
                  >
                    Don't have an account? <span className="underline">Register here</span>
                  </button>
                </div>
              </div>
            </div>
          ) : authMode === 'register' ? (
            // REGISTER FORM
            <div className="space-y-4">
              <input 
                type="text"
                placeholder="Name / Nickname"
                className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
              <input 
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <input 
                type="password"
                placeholder="Password (min 6 characters)"
                className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              
              <button 
                onClick={() => handleRegister(loginEmail, loginPassword, loginUsername)}
                className="w-full bg-skyrim-gold text-skyrim-dark font-bold py-2 rounded hover:bg-yellow-400 transition-colors"
              >
                Register
              </button>
              
              <div className="text-center">
                <button
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className="text-skyrim-gold hover:text-yellow-400 text-sm transition-colors"
                >
                  Already have an account? <span className="underline">Login here</span>
                </button>
              </div>
            </div>
          ) : (
            // FORGOT PASSWORD FORM
            <div className="space-y-4">
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="bg-green-900/30 border border-green-700 rounded p-4 text-green-200 text-sm">
                    <p className="font-bold mb-2">✓ Reset Email Sent!</p>
                    <p>Check your inbox for a password reset link. If you don't see it, check your spam folder.</p>
                  </div>
                  <button
                    onClick={() => { setAuthMode('login'); setResetEmailSent(false); setAuthError(null); }}
                    className="text-skyrim-gold hover:text-yellow-400 text-sm transition-colors"
                  >
                    ← Back to Login
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-400 text-sm text-center mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <input 
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword(loginEmail)}
                  />
                  
                  <button 
                    onClick={() => handleForgotPassword(loginEmail)}
                    className="w-full bg-skyrim-gold text-skyrim-dark font-bold py-2 rounded hover:bg-yellow-400 transition-colors"
                  >
                    Send Reset Link
                  </button>
                  
                  <div className="text-center">
                    <button
                      onClick={() => { setAuthMode('login'); setAuthError(null); }}
                      className="text-skyrim-gold hover:text-yellow-400 text-sm transition-colors"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleCreateCharacter = (profileId: string, name: string, archetype: string, race: string, gender: string, fullDetails?: GeneratedCharacterData) => {
      const charId = uniqueId();
      
      // 1. Base Character
      const newChar: Character = {
          id: charId,
          profileId,
          name,
          race: race || 'Nord',
          gender: gender || 'Male',
          archetype: archetype || 'Warrior',
          ...INITIAL_CHARACTER_TEMPLATE,
          ...fullDetails,
          gold: fullDetails?.startingGold || 0,
          lastPlayed: Date.now()
      };
      setCharacters([...characters, newChar]);
      setDirtyEntities(prev => new Set([...prev, charId]));

      // 2. Inventory
      if (fullDetails?.inventory) {
          const itemsWithId = fullDetails.inventory.map(i => ({
              id: uniqueId(),
              characterId: charId,
              name: i.name,
              type: i.type as any,
              description: i.description,
              quantity: i.quantity,
              equipped: false
          }));
          setItems(prev => [...prev, ...itemsWithId as any]);
          itemsWithId.forEach(item => {
            setDirtyEntities(prev => new Set([...prev, item.id]));
          });
      }

      // 3. Quests
      if (fullDetails?.quests) {
          const newQuests: CustomQuest[] = fullDetails.quests.map(q => ({
              id: uniqueId(),
              characterId: charId,
              title: q.title,
              description: q.description,
              location: q.location,
              dueDate: q.dueDate,
              objectives: [],
              status: 'active',
              createdAt: Date.now()
          }));
          setQuests(prev => [...prev, ...newQuests]);
          newQuests.forEach(quest => {
            setDirtyEntities(prev => new Set([...prev, quest.id]));
          });
      }

      // 4. Journal
      if (fullDetails?.journalEntries) {
          const newEntries = fullDetails.journalEntries.map(e => ({
              id: uniqueId(),
              characterId: charId,
              date: "4E 201",
              title: e.title,
              content: e.content
          }));
          setJournalEntries(prev => [...prev, ...newEntries as any]);
          newEntries.forEach(entry => {
            setDirtyEntities(prev => new Set([...prev, entry.id]));
          });
      }

      // 5. Story
      if (fullDetails?.openingStory) {
          const chapter: StoryChapter = {
              id: uniqueId(),
              characterId: charId,
              title: fullDetails.openingStory.title,
              content: fullDetails.openingStory.content,
              date: "4E 201",
              summary: "The beginning.",
              createdAt: Date.now()
          };
          setStoryChapters(prev => [...prev, chapter]);
          setDirtyEntities(prev => new Set([...prev, chapter.id]));
      }
  };

  const updateCharacter = (field: keyof Character, value: any) => {
      setCharacters(prev => prev.map(c => c.id === currentCharacterId ? { ...c, [field]: value } : c));
      if (currentCharacterId) {
        setDirtyEntities(prev => new Set([...prev, currentCharacterId]));
      }
  };

  const updateStoryChapter = (updatedChapter: StoryChapter) => {
      setStoryChapters(prev => prev.map(c => c.id === updatedChapter.id ? updatedChapter : c));
      setDirtyEntities(prev => new Set([...prev, updatedChapter.id]));
  };

  // === SURVIVAL & SHOP HANDLERS ===

  // Check for camping gear in inventory
  const hasCampingGear = items.some(i => 
    i.characterId === currentCharacterId && 
    (i.quantity || 0) > 0 &&
    ((i.name || '').toLowerCase().includes('camping kit') || (i.name || '').toLowerCase().includes('tent'))
  );
  
  const hasBedroll = items.some(i => 
    i.characterId === currentCharacterId && 
    (i.quantity || 0) > 0 &&
    (i.name || '').toLowerCase().includes('bedroll')
  );

  // Rest with options (outside/camp/inn, variable hours)
  const handleRestWithOptions = (options: { type: 'outside' | 'camp' | 'inn'; hours: number; innCost?: number }) => {
    if (!currentCharacterId || !activeCharacter) return;
    
    // Calculate fatigue reduction based on rest type
    let fatigueReduction = 15; // outside (poor rest)
    if (options.type === 'camp') {
      if (hasCampingGear) fatigueReduction = 40;
      else if (hasBedroll) fatigueReduction = 30;
      else fatigueReduction = 15;
    } else if (options.type === 'inn') {
      fatigueReduction = 50;
    }
    
    // Scale by hours (base is 8 hours)
    const scaledReduction = Math.round(fatigueReduction * (options.hours / 8));
    
    // Deduct gold for inn
    const goldChange = options.type === 'inn' && options.innCost ? -options.innCost : 0;
    
    handleGameUpdate({ 
      timeAdvanceMinutes: options.hours * 60, 
      needsChange: { fatigue: -scaledReduction },
      goldChange
    });
  };

  // Eat a specific item - uses dynamic nutrition values
  const handleEatItem = (item: InventoryItem) => {
    if (!currentCharacterId || !activeCharacter) return;
    const nutrition = getFoodNutrition(item.name);
    handleGameUpdate({
      timeAdvanceMinutes: 10,
      needsChange: { 
        hunger: -nutrition.hungerReduction, 
        thirst: -nutrition.thirstReduction,
        ...(nutrition.fatigueReduction ? { fatigue: -nutrition.fatigueReduction } : {})
      },
      removedItems: [{ name: item.name, quantity: 1 }]
    });
  };

  // Drink a specific item - uses dynamic nutrition values
  const handleDrinkItem = (item: InventoryItem) => {
    if (!currentCharacterId || !activeCharacter) return;
    const nutrition = getDrinkNutrition(item.name);
    handleGameUpdate({
      timeAdvanceMinutes: 5,
      needsChange: { 
        thirst: -nutrition.thirstReduction,
        hunger: -nutrition.hungerReduction,
        ...(nutrition.fatigueReduction ? { fatigue: -nutrition.fatigueReduction } : {})
      },
      removedItems: [{ name: item.name, quantity: 1 }]
    });
  };

  // Shop purchase handler
  const handleShopPurchase = (shopItem: { name: string; type: string; description: string; price: number }, quantity: number) => {
    if (!currentCharacterId || !activeCharacter) return;
    const totalCost = shopItem.price * quantity;
    if ((activeCharacter.gold || 0) < totalCost) {
      alert('Not enough gold!');
      return;
    }
    
    // Get stats for weapons and armor
    const stats = shouldHaveStats(shopItem.type) ? getItemStats(shopItem.name, shopItem.type) : {};
    
    handleGameUpdate({
      goldChange: -totalCost,
      newItems: [{
        name: shopItem.name,
        type: shopItem.type,
        description: shopItem.description,
        quantity,
        value: shopItem.price,
        ...stats  // Include armor/damage if applicable
      }]
    });
  };

  // Shop sell handler
  const handleShopSell = (item: InventoryItem, quantity: number, totalGold: number) => {
    if (!currentCharacterId || !activeCharacter) return;
    const currentQty = item.quantity || 0;
    if (currentQty < quantity) return;

    // Reduce item quantity or remove it
    const newQty = currentQty - quantity;
    if (newQty <= 0) {
      // Remove item entirely
      setItems(prev => prev.filter(i => i.id !== item.id));
      if (currentUser) {
        void deleteInventoryItem(currentUser.uid, item.id).catch(err => {
          console.error('Failed to delete sold item:', err);
        });
      }
    } else {
      // Update quantity
      const updatedItem = { ...item, quantity: newQty };
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      if (currentUser) {
        void saveInventoryItem(currentUser.uid, updatedItem).catch(err => {
          console.error('Failed to update sold item:', err);
        });
      }
    }

    // Add gold
    handleGameUpdate({
      goldChange: totalGold
    });
  };

  // Legacy handlers (keep for backwards compatibility but they won't be used directly)
  const handleRest = () => handleRestWithOptions({ type: 'outside', hours: 8 });
  const handleEat = () => {
    const food = pickConsumable('food');
    if (food) handleEatItem(food);
  };
  const handleDrink = () => {
    const drink = pickConsumable('drink');
    if (drink) handleDrinkItem(drink);
  };

  const pickConsumable = (kind: 'food' | 'drink'): InventoryItem | null => {
    if (!currentCharacterId) return null;
    const inv = items
      .filter(i => i.characterId === currentCharacterId)
      .filter(i => (i.quantity || 0) > 0);

    const foodKeywords = [
      'bread', 'apple', 'cheese', 'meat', 'stew', 'soup', 'potato', 'carrot',
      'salmon', 'leek', 'cabbage', 'sweetroll', 'pie', 'ration', 'food', 'meal'
    ];
    const drinkKeywords = [
      'water', 'ale', 'mead', 'wine', 'milk', 'drink', 'juice', 'tea'
    ];

    const keywords = kind === 'food' ? foodKeywords : drinkKeywords;

    const score = (it: InventoryItem) => {
      const name = String(it.name || '').toLowerCase();
      let s = 0;
      if (!name) return -999;

      // Prefer plausible consumable types.
      if (it.type === 'ingredient') s += 3;
      if (it.type === 'misc') s += 2;
      if (it.type === 'potion') s += kind === 'drink' ? 1 : -2;

      for (const k of keywords) {
        if (name.includes(k)) s += 5;
      }

      // Avoid health/magicka/stamina potions being treated as "Drink".
      if (kind === 'drink' && name.includes('potion')) {
        if (name.includes('health') || name.includes('magicka') || name.includes('stamina')) s -= 4;
      }
      return s;
    };

    let best: InventoryItem | null = null;
    let bestScore = 0;
    for (const it of inv) {
      const s = score(it);
      if (s > bestScore) {
        bestScore = s;
        best = it;
      }
    }
    return best;
  };
  
  // Helper to get active data
  const activeCharacter = characters.find(c => c.id === currentCharacterId);

  const getCharacterItems = () => items.filter((i: any) => i.characterId === currentCharacterId);
  
  const setCharacterItems = (newCharItems: InventoryItem[]) => {
      const currentCharItems = items.filter((i: any) => i.characterId === currentCharacterId);
      const others = items.filter((i: any) => i.characterId !== currentCharacterId);
      const taggedItems = newCharItems.map(i => ({ ...i, characterId: currentCharacterId }));
      
      // Find deleted items (items in current state but not in new state)
      const newItemIds = new Set(newCharItems.map(i => i.id));
      const deletedItems = currentCharItems.filter(i => !newItemIds.has(i.id));
      
      // Delete removed items from Firestore
      if (currentUser && deletedItems.length > 0) {
        deletedItems.forEach(item => {
          void deleteInventoryItem(currentUser.uid, item.id).catch(err => {
            console.error('Failed to delete item from Firestore:', err);
          });
        });
      }
      
      setItems([...others, ...taggedItems]);
      taggedItems.forEach(item => {
        setDirtyEntities(prev => new Set([...prev, item.id]));
      });
  };

  const getCharacterQuests = () => quests.filter(q => q.characterId === currentCharacterId);
  const setCharacterQuests = (newQuests: CustomQuest[]) => {
      const others = quests.filter(q => q.characterId !== currentCharacterId);
      const tagged = newQuests.map(q => ({ ...q, characterId: currentCharacterId }));
      setQuests([...others, ...tagged]);
      tagged.forEach(quest => {
        setDirtyEntities(prev => new Set([...prev, quest.id]));
      });
  };

  const getCharacterStory = () => storyChapters.filter(s => s.characterId === currentCharacterId);
  
  const getCharacterJournal = () => journalEntries.filter((j: any) => j.characterId === currentCharacterId);
  const setCharacterJournal = (newEntries: JournalEntry[]) => {
      const others = journalEntries.filter((j: any) => j.characterId !== currentCharacterId);
      const tagged = newEntries.map(e => ({ ...e, characterId: currentCharacterId }));
      setJournalEntries([...others, ...tagged]);
      tagged.forEach(entry => {
        setDirtyEntities(prev => new Set([...prev, entry.id]));
      });
  };

  // AI Game Master Integration
  const handleGameUpdate = (updates: GameStateUpdate) => {
      if (!currentCharacterId || !activeCharacter) return;

      const hasAnyUpdate = Boolean(
        updates?.narrative ||
          (updates?.newQuests && updates.newQuests.length) ||
          (updates?.updateQuests && updates.updateQuests.length) ||
          (updates?.newItems && updates.newItems.length) ||
          (updates?.removedItems && updates.removedItems.length) ||
          updates?.statUpdates ||
          typeof updates?.goldChange === 'number' ||
          typeof updates?.xpChange === 'number' ||
          typeof updates?.timeAdvanceMinutes === 'number' ||
          (updates?.needsChange && Object.keys(updates.needsChange).length) ||
          (updates?.characterUpdates && Object.keys(updates.characterUpdates).length) ||
          (updates?.vitalsChange && Object.keys(updates.vitalsChange).length)
      );
      if (!hasAnyUpdate) return;

      // 0a. Character detail updates (hero sheet fields)
      if (updates.characterUpdates && Object.keys(updates.characterUpdates).length) {
        setCharacters(prev => prev.map(c => {
          if (c.id !== currentCharacterId) return c;
          const updatedChar = { ...c };
          const cu = updates.characterUpdates!;
          if (cu.identity !== undefined) updatedChar.identity = cu.identity;
          if (cu.psychology !== undefined) updatedChar.psychology = cu.psychology;
          if (cu.breakingPoint !== undefined) updatedChar.breakingPoint = cu.breakingPoint;
          if (cu.moralCode !== undefined) updatedChar.moralCode = cu.moralCode;
          if (cu.allowedActions !== undefined) updatedChar.allowedActions = cu.allowedActions;
          if (cu.forbiddenActions !== undefined) updatedChar.forbiddenActions = cu.forbiddenActions;
          if (cu.fears !== undefined) updatedChar.fears = cu.fears;
          if (cu.weaknesses !== undefined) updatedChar.weaknesses = cu.weaknesses;
          if (cu.talents !== undefined) updatedChar.talents = cu.talents;
          if (cu.magicApproach !== undefined) updatedChar.magicApproach = cu.magicApproach;
          if (cu.factionAllegiance !== undefined) updatedChar.factionAllegiance = cu.factionAllegiance;
          if (cu.worldview !== undefined) updatedChar.worldview = cu.worldview;
          if (cu.daedricPerception !== undefined) updatedChar.daedricPerception = cu.daedricPerception;
          if (cu.forcedBehavior !== undefined) updatedChar.forcedBehavior = cu.forcedBehavior;
          if (cu.longTermEvolution !== undefined) updatedChar.longTermEvolution = cu.longTermEvolution;
          if (cu.backstory !== undefined) updatedChar.backstory = cu.backstory;
          setDirtyEntities(d => new Set([...d, c.id]));
          return updatedChar;
        }));
      }

      // 0. Time & Needs (progression)
      const timeAdvance = Math.trunc(Number(updates.timeAdvanceMinutes || 0));
      const explicitNeedsChange = updates.needsChange || {};

      if (timeAdvance !== 0 || (explicitNeedsChange && Object.keys(explicitNeedsChange).length)) {
        setCharacters(prev => prev.map(c => {
          if (c.id !== currentCharacterId) return c;

          const currentTime = (c as any).time || INITIAL_CHARACTER_TEMPLATE.time;
          const currentNeeds = (c as any).needs || INITIAL_CHARACTER_TEMPLATE.needs;

          const nextTime = timeAdvance !== 0 ? addMinutesToTime(currentTime, timeAdvance) : currentTime;

          // Passive needs increase from time passing
          const hungerFromTime = calcNeedFromTime(timeAdvance, NEED_RATES.hungerPerMinute);
          const thirstFromTime = calcNeedFromTime(timeAdvance, NEED_RATES.thirstPerMinute);
          const fatigueFromTime = calcNeedFromTime(timeAdvance, NEED_RATES.fatiguePerMinute);

          const nextNeeds = {
            hunger: clamp(
              Number(currentNeeds.hunger || 0) + hungerFromTime + Number((explicitNeedsChange as any).hunger || 0),
              0,
              100
            ),
            thirst: clamp(
              Number(currentNeeds.thirst || 0) + thirstFromTime + Number((explicitNeedsChange as any).thirst || 0),
              0,
              100
            ),
            fatigue: clamp(
              Number(currentNeeds.fatigue || 0) + fatigueFromTime + Number((explicitNeedsChange as any).fatigue || 0),
              0,
              100
            ),
          };

          setDirtyEntities(d => new Set([...d, c.id]));
          return { ...c, time: nextTime, needs: nextNeeds };
        }));
      }

      // 1. Narrative -> Story Chapter
      if (updates.narrative) {
          const chapter: StoryChapter = {
              id: uniqueId(),
              characterId: currentCharacterId,
              title: updates.narrative.title,
              content: updates.narrative.content,
              date: "4E 201",
              summary: updates.narrative.title,
              createdAt: Date.now()
          };
          setStoryChapters(prev => [...prev, chapter]);
          setDirtyEntities(prev => new Set([...prev, chapter.id]));
      }

      // 2. New Quests
      if (updates.newQuests) {
          const addedQuests = updates.newQuests.map(q => ({
              id: uniqueId(),
              characterId: currentCharacterId,
              title: q.title,
              description: q.description,
              location: q.location,
              dueDate: q.dueDate,
              objectives: (q.objectives || []).map(o => ({
                id: uniqueId(),
                description: o.description,
                completed: Boolean(o.completed)
              })),
              status: 'active' as const,
              createdAt: Date.now()
          }));
          setQuests(prev => [...prev, ...addedQuests]);
          addedQuests.forEach(quest => {
            setDirtyEntities(prev => new Set([...prev, quest.id]));
          });
      }

      // 3. Update Quests
      if (updates.updateQuests) {
          setQuests(prev => prev.map(q => {
              if (q.characterId !== currentCharacterId) return q;
              const update = updates.updateQuests?.find(u => u.title.toLowerCase() === q.title.toLowerCase());
              if (update) {
                  setDirtyEntities(prev => new Set([...prev, q.id]));
                  return { ...q, status: update.status };
              }
              return q;
          }));
      }

      // 4. New Items
      if (updates.newItems) {
           setItems(prev => {
             const next = [...prev];
             for (const i of updates.newItems || []) {
               const name = (i.name || '').trim();
               if (!name) continue;

               const idx = next.findIndex(it =>
                 it.characterId === currentCharacterId &&
                 (it.name || '').trim().toLowerCase() === name.toLowerCase()
               );

               const addQty = Math.max(1, Number(i.quantity || 1));

               if (idx >= 0) {
                 const existing = next[idx];
                 const updated = {
                   ...existing,
                   quantity: (existing.quantity || 0) + addQty,
                   description: existing.description || i.description || '',
                   type: (existing.type || (i.type as any)) as any,
                   // Update stats if provided (in case item didn't have them before)
                   armor: existing.armor || (i as any).armor || undefined,
                   damage: existing.damage || (i as any).damage || undefined,
                   value: existing.value || (i as any).value || undefined,
                   slot: existing.slot || (i as any).slot || undefined,
                 };
                 next[idx] = updated;
                 setDirtyEntities(d => new Set([...d, updated.id]));
               } else {
                 const added: InventoryItem = {
                   id: uniqueId(),
                   characterId: currentCharacterId,
                   name,
                   type: i.type as any,
                   description: i.description || '',
                   quantity: addQty,
                   equipped: false,
                   // Include stats from incoming item
                   armor: (i as any).armor,
                   damage: (i as any).damage,
                   value: (i as any).value,
                   slot: (i as any).slot,
                 };
                 next.push(added);
                 setDirtyEntities(d => new Set([...d, added.id]));
               }
             }
             return next;
           });
      }

      // 4b. Removed Items
      if (updates.removedItems) {
        setItems(prev => {
          const next = [...prev];
          for (const r of updates.removedItems || []) {
            const name = (r.name || '').trim();
            if (!name) continue;

            const idx = next.findIndex(it =>
              it.characterId === currentCharacterId &&
              (it.name || '').trim().toLowerCase() === name.toLowerCase()
            );
            if (idx < 0) continue;

            const existing = next[idx];
            const removeQty = Math.max(1, Number(r.quantity || 1));
            const newQty = (existing.quantity || 0) - removeQty;

            if (newQty > 0) {
              const updated = { ...existing, quantity: newQty };
              next[idx] = updated;
              setDirtyEntities(d => new Set([...d, updated.id]));
            } else {
              const [removed] = next.splice(idx, 1);
              if (currentUser?.uid) {
                void deleteInventoryItem(currentUser.uid, removed.id).catch(err => {
                  console.warn('Failed to delete inventory item from Firestore:', err);
                });
              }
            }
          }
          return next;
        });
      }

      // 5. Stats
      if (updates.statUpdates) {
          setCharacters(prev => prev.map(c => {
              if (c.id !== currentCharacterId) return c;
              setDirtyEntities(prev => new Set([...prev, c.id]));
              return {
                  ...c,
                  stats: { ...c.stats, ...updates.statUpdates }
              };
          }));
      }

      // 5b. Vitals (currentHealth, currentMagicka, currentStamina) changes from adventure
      if (updates.vitalsChange && Object.keys(updates.vitalsChange).length) {
          setCharacters(prev => prev.map(c => {
              if (c.id !== currentCharacterId) return c;
              setDirtyEntities(prev => new Set([...prev, c.id]));
              
              const currentVitals = c.currentVitals || {
                currentHealth: c.stats.health,
                currentMagicka: c.stats.magicka,
                currentStamina: c.stats.stamina
              };
              
              const newVitals = {
                currentHealth: Math.max(0, Math.min(c.stats.health, (currentVitals.currentHealth ?? c.stats.health) + (updates.vitalsChange?.currentHealth ?? 0))),
                currentMagicka: Math.max(0, Math.min(c.stats.magicka, (currentVitals.currentMagicka ?? c.stats.magicka) + (updates.vitalsChange?.currentMagicka ?? 0))),
                currentStamina: Math.max(0, Math.min(c.stats.stamina, (currentVitals.currentStamina ?? c.stats.stamina) + (updates.vitalsChange?.currentStamina ?? 0)))
              };
              
              return {
                  ...c,
                  currentVitals: newVitals
              };
          }));
      }

      // 6. Gold
      if (typeof updates.goldChange === 'number' && updates.goldChange !== 0) {
         setCharacters(prev => prev.map(c => {
              if (c.id !== currentCharacterId) return c;
              setDirtyEntities(prev => new Set([...prev, c.id]));
              return { ...c, gold: (c.gold || 0) + (updates.goldChange || 0) };
         }));
      }

      // 6b. XP with Level-Up Check
      const XP_PER_LEVEL = 100;
      let levelUpInfo: { newLevel: number; charName: string; statBonus: { health: number; magicka: number; stamina: number } } | null = null;
      
      if (typeof updates.xpChange === 'number' && updates.xpChange !== 0) {
        setCharacters(prev => prev.map(c => {
          if (c.id !== currentCharacterId) return c;
          setDirtyEntities(prev => new Set([...prev, c.id]));
          
          const newXP = (c.experience || 0) + (updates.xpChange || 0);
          const currentLevel = c.level || 1;
          const xpForNextLevel = currentLevel * XP_PER_LEVEL;
          
          // Check if we leveled up
          if (newXP >= xpForNextLevel) {
            const newLevel = currentLevel + 1;
            const remainingXP = newXP - xpForNextLevel;
            
            // Bonus stats on level up: +10 to health, magicka, or stamina based on archetype
            const statBonus = { health: 0, magicka: 0, stamina: 0 };
            const archetype = c.archetype?.toLowerCase() || '';
            if (archetype.includes('mage') || archetype.includes('wizard') || archetype.includes('sorcerer')) {
              statBonus.magicka = 10;
              statBonus.health = 5;
            } else if (archetype.includes('thief') || archetype.includes('rogue') || archetype.includes('assassin')) {
              statBonus.stamina = 10;
              statBonus.health = 5;
            } else {
              statBonus.health = 10;
              statBonus.stamina = 5;
            }
            
            // Store level-up info for journal entry
            levelUpInfo = { newLevel, charName: c.name, statBonus };
            
            // Show level-up message briefly
            setSaveMessage(`🎉 LEVEL UP! ${c.name} is now level ${newLevel}!`);
            setTimeout(() => setSaveMessage(null), 4000);
            
            return {
              ...c,
              level: newLevel,
              experience: remainingXP,
              stats: {
                health: (c.stats?.health || 100) + statBonus.health,
                magicka: (c.stats?.magicka || 100) + statBonus.magicka,
                stamina: (c.stats?.stamina || 100) + statBonus.stamina
              }
            };
          }
          
          return { ...c, experience: newXP };
        }));
      }

      // 7. Auto-Journal
      const title =
        updates.narrative?.title ||
        (updates.newQuests?.length ? 'New Quest' : undefined) ||
        (updates.updateQuests?.length ? 'Quest Update' : undefined) ||
        (updates.newItems?.length || updates.removedItems?.length ? 'Supplies & Spoils' : undefined) ||
        (typeof updates.goldChange === 'number' && updates.goldChange !== 0 ? 'Coin & Debts' : undefined) ||
        (typeof updates.xpChange === 'number' && updates.xpChange !== 0 ? 'Lessons Learned' : undefined) ||
        (updates.statUpdates ? 'Condition' : undefined) ||
        (typeof updates.timeAdvanceMinutes === 'number' && updates.timeAdvanceMinutes !== 0 ? 'Time Passes' : undefined) ||
        (updates.needsChange ? 'Survival' : undefined) ||
        'Field Notes';

      const lines: string[] = [];

      if (updates.narrative?.content) {
        lines.push(`I remember it like this:\n${updates.narrative.content.trim()}`);
      }

      const changes: string[] = [];

      if (typeof updates.timeAdvanceMinutes === 'number' && updates.timeAdvanceMinutes !== 0) {
        const mins = Math.abs(Math.trunc(updates.timeAdvanceMinutes));
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        const dur = hrs > 0 ? `${hrs}h${rem ? ` ${rem}m` : ''}` : `${rem}m`;
        changes.push(`Time passed: ${dur}.`);

        // Use the *new* time if we can derive it, otherwise a best-effort.
        const nextTime = addMinutesToTime((activeCharacter as any).time || INITIAL_CHARACTER_TEMPLATE.time, updates.timeAdvanceMinutes);
        changes.push(`It is now ${formatTime(nextTime)}.`);

        const hungerInc = calcNeedFromTime(updates.timeAdvanceMinutes, NEED_RATES.hungerPerMinute);
        const thirstInc = calcNeedFromTime(updates.timeAdvanceMinutes, NEED_RATES.thirstPerMinute);
        const fatigueInc = calcNeedFromTime(updates.timeAdvanceMinutes, NEED_RATES.fatiguePerMinute);
        const parts: string[] = [];
        if (hungerInc) parts.push(`hunger +${hungerInc}`);
        if (thirstInc) parts.push(`thirst +${thirstInc}`);
        if (fatigueInc) parts.push(`fatigue +${fatigueInc}`);
        if (parts.length) changes.push(`As the minutes wore on, I felt it: ${parts.join(', ')}.`);
      }

      if (typeof updates.goldChange === 'number' && updates.goldChange !== 0) {
        if (updates.goldChange > 0) changes.push(`I gained ${updates.goldChange} gold.`);
        else changes.push(`I spent ${Math.abs(updates.goldChange)} gold.`);
      }
      if (typeof updates.xpChange === 'number' && updates.xpChange !== 0) {
        if (updates.xpChange > 0) changes.push(`I gained ${updates.xpChange} experience.`);
        else changes.push(`I lost ${Math.abs(updates.xpChange)} experience.`);
        
        // Add level-up entry if it occurred
        if (levelUpInfo) {
          changes.push(`🎉 I LEVELED UP! I am now level ${levelUpInfo.newLevel}!`);
          const bonusParts: string[] = [];
          if (levelUpInfo.statBonus.health > 0) bonusParts.push(`+${levelUpInfo.statBonus.health} Health`);
          if (levelUpInfo.statBonus.magicka > 0) bonusParts.push(`+${levelUpInfo.statBonus.magicka} Magicka`);
          if (levelUpInfo.statBonus.stamina > 0) bonusParts.push(`+${levelUpInfo.statBonus.stamina} Stamina`);
          if (bonusParts.length) changes.push(`My training has paid off: ${bonusParts.join(', ')}.`);
        }
      }

      if (updates.needsChange && Object.keys(updates.needsChange).length) {
        const parts: string[] = [];
        const h = Number((updates.needsChange as any).hunger || 0);
        const t = Number((updates.needsChange as any).thirst || 0);
        const f = Number((updates.needsChange as any).fatigue || 0);
        if (h) parts.push(`hunger ${h > 0 ? `+${h}` : `${h}`}`);
        if (t) parts.push(`thirst ${t > 0 ? `+${t}` : `${t}`}`);
        if (f) parts.push(`fatigue ${f > 0 ? `+${f}` : `${f}`}`);
        if (parts.length) changes.push(`My body felt it: ${parts.join(', ')}.`);
      }

      if (updates.statUpdates && Object.keys(updates.statUpdates).length) {
        const statParts: string[] = [];
        if (typeof updates.statUpdates.health === 'number') statParts.push(`health is now ${updates.statUpdates.health}`);
        if (typeof updates.statUpdates.magicka === 'number') statParts.push(`magicka is now ${updates.statUpdates.magicka}`);
        if (typeof updates.statUpdates.stamina === 'number') statParts.push(`stamina is now ${updates.statUpdates.stamina}`);
        if (statParts.length) changes.push(`My ${statParts.join(', ')}.`);
      }

      if (updates.newItems?.length) {
        const items = updates.newItems
          .map(i => {
            const qty = Math.max(1, Number(i.quantity || 1));
            return `${qty}× ${String(i.name || '').trim()}`.trim();
          })
          .filter(Boolean);
        if (items.length) changes.push(`I gained ${items.join(', ')}.`);
      }

      if (updates.removedItems?.length) {
        const items = updates.removedItems
          .map(i => {
            const qty = Math.max(1, Number(i.quantity || 1));
            return `${qty}× ${String(i.name || '').trim()}`.trim();
          })
          .filter(Boolean);
        if (items.length) changes.push(`I used or lost ${items.join(', ')}.`);
      }

      if (updates.newQuests?.length) {
        const questSummaries = updates.newQuests
          .map(q => {
            const loc = q.location ? ` (${q.location})` : '';
            const due = q.dueDate ? ` — Due: ${q.dueDate}` : '';
            const objectives = (q.objectives || []).map(o => `- ${o.description}`).join('\n');
            const objBlock = objectives ? `\nMy objectives:\n${objectives}` : '';
            const desc = (q.description || '').trim();
            return `I accepted a new quest: ${q.title}${loc}${due}.${desc ? `\n${desc}` : ''}${objBlock}`.trim();
          })
          .filter(Boolean);
        if (questSummaries.length) lines.push(questSummaries.join('\n\n'));
      }

      if (updates.updateQuests?.length) {
        const questUpdates = updates.updateQuests
          .map(q => {
            if (q.status === 'completed') return `I completed the quest: ${q.title}.`;
            if (q.status === 'failed') return `I failed the quest: ${q.title}.`;
            return `I updated my quest: ${q.title}.`;
          })
          .filter(Boolean);
        if (questUpdates.length) changes.push(...questUpdates);
      }

      if (changes.length) {
        lines.push(`\nMy notes:\n- ${changes.join('\n- ')}`);
      }

      const entry: JournalEntry = {
        id: uniqueId(),
        characterId: currentCharacterId,
        date: "4E 201",
        title,
        content: lines.filter(Boolean).join('\n\n').trim(),
      };
      setJournalEntries(prev => [...prev, entry]);
      setDirtyEntities(prev => new Set([...prev, entry.id]));

      // 8. Automatic Music Update based on ambient context
      if (updates.ambientContext || updates.simulationUpdate?.sceneStart) {
        const ambientCtx: AmbientContext = {
          localeType: updates.ambientContext?.localeType,
          inCombat: updates.ambientContext?.inCombat || updates.simulationUpdate?.phaseChange === 'combat',
          mood: updates.ambientContext?.mood,
          timeOfDay: (activeCharacter as any)?.time?.hour ?? 12
        };
        // Also check sceneStart for locale hints
        if (updates.simulationUpdate?.sceneStart) {
          const loc = updates.simulationUpdate.sceneStart.location?.toLowerCase() || '';
          const sceneType = updates.simulationUpdate.sceneStart.type;
          
          // Infer locale type from scene info if not explicitly set
          if (!ambientCtx.localeType) {
            if (sceneType === 'combat') {
              ambientCtx.inCombat = true;
            } else if (loc.includes('tavern') || loc.includes('inn') || loc.includes('bar')) {
              ambientCtx.localeType = 'tavern';
            } else if (loc.includes('dungeon') || loc.includes('cave') || loc.includes('ruin') || loc.includes('crypt')) {
              ambientCtx.localeType = 'dungeon';
            } else if (loc.includes('city') || loc.includes('whiterun') || loc.includes('solitude') || loc.includes('riften') || loc.includes('windhelm') || loc.includes('markarth')) {
              ambientCtx.localeType = 'city';
            } else if (loc.includes('road') || loc.includes('path') || loc.includes('trail')) {
              ambientCtx.localeType = 'road';
            } else if (loc.includes('house') || loc.includes('shop') || loc.includes('hall') || loc.includes('temple')) {
              ambientCtx.localeType = 'interior';
            } else {
              ambientCtx.localeType = 'wilderness';
            }
          }
        }
        updateMusicForContext(ambientCtx);
      }
  };

  const getAIContext = () => {
    if (!activeCharacter) return "";
    return JSON.stringify({
        character: activeCharacter,
        inventory: getCharacterItems(),
        activeQuests: getCharacterQuests().filter(q => q.status === 'active'),
        recentStory: getCharacterStory().slice(-3)
    });
  };

  // Render Logic
  if (!currentCharacterId) {
      return (
        <>
          <CharacterSelect 
              profileId={currentProfileId}
              characters={characters}
              onCreateCharacter={handleCreateCharacter}
              onSelectCharacter={async (cid) => {
                setCurrentCharacterId(cid);
                if (currentUser) {
                  await setActiveCharacter(currentUser.uid, cid);
                }
              }}
              onLogout={handleLogout}
              onUpdateCharacter={handleUpdateCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onMarkCharacterDead={handleMarkCharacterDead}
          />
          <OnboardingModal open={onboardingOpen} onComplete={completeOnboarding} />
        </>
      );
  }

  return (
    <AppContext.Provider value={{
      handleManualSave,
      isSaving,
      handleLogout,
      setCurrentCharacterId,
      aiModel,
      setAiModel,
      isAnonymous: currentUser?.isAnonymous || false,
      handleExportPDF: () => {}, // TODO: Implement export
      isExporting: false, // TODO: Implement export state
      handleGenerateProfileImage: async () => {
        if (!activeCharacter) return;
        updateCharacter('profileImage', null); // Optionally clear first
        try {
          // Optionally set a loading state here if you want to show spinner
          const imageUrl = await import('./services/geminiService').then(m => m.generateCharacterProfileImage(
            activeCharacter.name,
            activeCharacter.race,
            activeCharacter.gender,
            activeCharacter.archetype
          ));
          if (imageUrl) updateCharacter('profileImage', imageUrl);
        } catch (e) {
          alert('Profile image generation failed.');
        }
      },
      isGeneratingProfileImage: false, // (Optional: implement spinner state if needed)
      handleCreateImagePrompt: () => {
        if (!activeCharacter) return;
        const prompt = `${activeCharacter.name}, a ${activeCharacter.gender} ${activeCharacter.race} ${activeCharacter.archetype}. ${activeCharacter.identity} ${activeCharacter.psychology} ${activeCharacter.magicApproach}`;
        window.prompt('Copy this prompt for AI image generation:', prompt);
      },
      handleUploadPhoto: () => {}, // TODO: Implement upload
      // New survival & shop handlers
      handleRestWithOptions,
      handleEatItem,
      handleDrinkItem,
      handleShopPurchase,
      handleShopSell,
      gold: activeCharacter?.gold || 0,
      inventory: getCharacterItems(),
      hasCampingGear,
      hasBedroll,
      characterLevel: activeCharacter?.level || 1,
    }}>
      <div className="min-h-screen bg-skyrim-dark text-skyrim-text font-sans selection:bg-skyrim-gold selection:text-skyrim-dark">
        <OnboardingModal open={onboardingOpen} onComplete={completeOnboarding} />
        {/* Navigation Header */}
        <nav className="fixed top-0 left-0 right-0 bg-skyrim-paper/95 backdrop-blur-md border-b border-skyrim-gold/30 z-40 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2 text-skyrim-gold font-serif font-bold text-xl tracking-widest uppercase cursor-pointer" onClick={() => setCurrentCharacterId(null)}>
                <Skull size={24} />
                <span className="hidden md:inline">Skyrim Aetherius</span>
              </div>
              <div className="flex flex-nowrap items-center gap-1 sm:gap-2 relative overflow-hidden">
                {[
                    { id: TABS.CHARACTER, icon: User, label: 'Hero' },
                    { id: TABS.INVENTORY, icon: Package, label: 'Items' },
                    { id: TABS.QUESTS, icon: Scroll, label: 'Quests' },
                    { id: TABS.STORY, icon: Feather, label: 'Story' },
                    { id: TABS.JOURNAL, icon: BookOpen, label: 'Journal' },
                    { id: TABS.ADVENTURE, icon: Swords, label: 'Adventure' },
                ].map(tab => (
                  <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded transition-all duration-300 text-sm md:text-base ${
                      activeTab === tab.id 
                          ? 'bg-skyrim-gold text-skyrim-dark font-bold' 
                          : 'text-gray-400 hover:text-skyrim-gold hover:bg-white/5'
                      }`}
                  >
                      <tab.icon size={16} />
                      <span className="hidden md:inline">{tab.label}</span>
                  </button>
                ))}
                {/* Actions button inline with tabs */}
                <ActionBarToggle />
              </div>
            </div>
          </div>
          {/* Only one Actions button: ActionBarToggle is inline with tabs, remove default ActionBar here */}
        </nav>

        {/* Save Message */}
        {saveMessage && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-sm font-bold z-50 transition-all ${
            saveMessage.includes('✓') 
              ? 'bg-green-900/80 text-green-200 border border-green-700' 
              : 'bg-red-900/80 text-red-200 border border-red-700'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Main Content Area */}
        <main className="pt-24 px-2 sm:px-4 min-h-screen pb-20">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === TABS.CHARACTER && activeCharacter && (
              <CharacterSheet 
                character={activeCharacter} 
                updateCharacter={updateCharacter} 
                inventory={getCharacterItems()}
                quests={getCharacterQuests()}
                journal={getCharacterJournal()}
                story={getCharacterStory()}
                onRest={handleRestWithOptions}
                onEat={handleEatItem}
                onDrink={handleDrinkItem}
                hasCampingGear={hasCampingGear}
                hasBedroll={hasBedroll}
              />
            )}
            {activeTab === TABS.INVENTORY && activeCharacter && (
              <Inventory 
                  items={getCharacterItems()} 
                  setItems={setCharacterItems} 
                  gold={activeCharacter.gold || 0} 
                  setGold={(amt) => updateCharacter('gold', amt)}
              />
            )}
            {activeTab === TABS.QUESTS && (
              <QuestLog quests={getCharacterQuests()} setQuests={setCharacterQuests} />
            )}
            {activeTab === TABS.STORY && (
              <StoryLog 
                chapters={getCharacterStory()} 
                onUpdateChapter={updateStoryChapter}
                onAddChapter={(chapter) => setStoryChapters(prev => [...prev, chapter])}
                onGameUpdate={handleGameUpdate}
                character={activeCharacter}
                quests={getCharacterQuests()}
                journal={getCharacterJournal()}
                items={getCharacterItems()}
                userId={currentUser?.uid}
              />
            )}
            {activeTab === TABS.JOURNAL && (
              <Journal entries={getCharacterJournal()} setEntries={setCharacterJournal} />
            )}
            {activeTab === TABS.ADVENTURE && (
              <AdventureChat
                userId={currentUser?.uid}
                model={aiModel}
                character={activeCharacter}
                inventory={getCharacterItems()}
                quests={getCharacterQuests()}
                journal={getCharacterJournal()}
                story={getCharacterStory()}
                onUpdateState={handleGameUpdate}
              />
            )}
          </div>
        </main>

        {/* AI Game Master */}
        <AIScribe contextData={getAIContext()} onUpdateState={handleGameUpdate} model={aiModel} />

        {/* Update Notification */}
        <UpdateNotification position="bottom" />

      </div>
    </AppContext.Provider>
  );
};

export default App;