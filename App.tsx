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
import { User, Scroll, BookOpen, Skull, Package, Feather, LogOut, Users, Loader, Save, Swords } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  auth,
  onAuthChange, 
  registerUser, 
  loginUser, 
  logoutUser
} from './services/firebase';
import { 
  initializeFirestoreDb,
  loadCharacters,
  loadInventoryItems,
  loadQuests,
  loadJournalEntries,
  loadStoryChapters,
  loadUserProfiles,
  saveCharacter,
  saveInventoryItem,
  deleteInventoryItem,
  saveQuest,
  saveJournalEntry,
  saveStoryChapter,
  saveUserProfile,
  batchSaveGameState
} from './services/firestore';
import {
  setUserOnline,
  setUserOffline,
  setActiveCharacter,
  clearActiveCharacter
} from './services/realtime';
import type { PreferredAIModel } from './services/geminiService';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

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
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');

  // Global State (in-memory)
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quests, setQuests] = useState<CustomQuest[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [storyChapters, setStoryChapters] = useState<StoryChapter[]>([]);

  // Dirty state tracking for debounced saves
  const [dirtyEntities, setDirtyEntities] = useState<Set<string>>(new Set());

  // Session State
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(TABS.CHARACTER);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // AI Model Selection (global)
  const [aiModel, setAiModel] = useState<PreferredAIModel>('gemini-2.0-flash');

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
      
      if (user) {
        try {
          // Initialize Firestore (must happen before any queries)
          console.log('Initializing Firestore for user:', user.uid);
          await initializeFirestoreDb();

          // Set user online status in Realtime DB
          await setUserOnline(user.uid);

          // Load all data from Firestore in parallel
          console.log('Loading user data from Firestore...');
          const [userProfiles, userCharacters, userItems, userQuests, userEntries, userChapters] = await Promise.all([
            loadUserProfiles(user.uid),
            loadCharacters(user.uid),
            loadInventoryItems(user.uid),
            loadQuests(user.uid),
            loadJournalEntries(user.uid),
            loadStoryChapters(user.uid)
          ]);

          console.log('Data loaded successfully:', { userProfiles, userCharacters, userItems });
          setProfiles(userProfiles);
          setCharacters(userCharacters);
          setItems(userItems);
          setQuests(userQuests);
          setJournalEntries(userEntries);
          setStoryChapters(userChapters);
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
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
  const handleCreateProfile = (name: string) => {
      const newProfile: UserProfile = { id: uniqueId(), username: name, created: Date.now() };
      setProfiles([...profiles, newProfile]);
      setDirtyEntities(prev => new Set([...prev, newProfile.id]));
  };

  const handleUpdateProfile = (profileId: string, newName: string) => {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, username: newName } : p));
      setDirtyEntities(prev => new Set([...prev, profileId]));
  };

  const handleUpdateCharacter = (characterId: string, newName: string) => {
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, name: newName } : c));
      setDirtyEntities(prev => new Set([...prev, characterId]));
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
      await registerUser(email, password);
      // Create user profile
      if (currentUser) {
        const newProfile: UserProfile = { id: uniqueId(), username, created: Date.now() };
        setProfiles([...profiles, newProfile]);
        setDirtyEntities(prev => new Set([...prev, newProfile.id]));
      }
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
      await loginUser(email, password);
      setLoginEmail('');
      setLoginPassword('');
      setAuthError(null);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setAuthError('No user found for this email');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Incorrect password');
      } else {
        setAuthError('Login failed: ' + error.message);
      }
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

  // Login Screen
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
          
          <div className="space-y-4">
            <input 
              type="text"
              placeholder="Username"
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
              placeholder="Password"
              className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            
            <button 
              onClick={() => handleLogin(loginEmail, loginPassword)}
              className="w-full bg-skyrim-gold text-skyrim-dark font-bold py-2 rounded hover:bg-yellow-400 transition-colors"
            >
              Login
            </button>
            
            <button 
              onClick={() => handleRegister(loginEmail, loginPassword, loginUsername)}
              className="w-full bg-skyrim-gold/20 text-skyrim-gold font-bold py-2 rounded border border-skyrim-gold hover:bg-skyrim-gold/30 transition-colors"
            >
              Register
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-6">
            Demo test emails: test@example.com
          </p>
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
  
  // Helper to get active data
  const activeCharacter = characters.find(c => c.id === currentCharacterId);
  const getCharacterItems = () => items.filter((i: any) => i.characterId === currentCharacterId);
  
  const setCharacterItems = (newCharItems: InventoryItem[]) => {
      const others = items.filter((i: any) => i.characterId !== currentCharacterId);
      const taggedItems = newCharItems.map(i => ({ ...i, characterId: currentCharacterId }));
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
          typeof updates?.xpChange === 'number'
      );
      if (!hasAnyUpdate) return;

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
                 };
                 next[idx] = updated;
                 setDirtyEntities(d => new Set([...d, updated.id]));
               } else {
                 const added = {
                   id: uniqueId(),
                   characterId: currentCharacterId,
                   name,
                   type: i.type as any,
                   description: i.description || '',
                   quantity: addQty,
                   equipped: false
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

      // 6. Gold
      if (updates.goldChange) {
         setCharacters(prev => prev.map(c => {
              if (c.id !== currentCharacterId) return c;
              setDirtyEntities(prev => new Set([...prev, c.id]));
              return { ...c, gold: (c.gold || 0) + (updates.goldChange || 0) };
         }));
      }

      // 7. Auto-Journal
      const title =
        updates.narrative?.title ||
        (updates.newQuests?.length ? 'New Quest' : undefined) ||
        (updates.updateQuests?.length ? 'Quest Update' : undefined) ||
        (updates.newItems?.length || updates.removedItems?.length ? 'Supplies & Spoils' : undefined) ||
        (updates.goldChange ? 'Coin & Debts' : undefined) ||
        (updates.statUpdates ? 'Condition' : undefined) ||
        'Field Notes';

      const lines: string[] = [];

      if (updates.narrative?.content) {
        lines.push(`I remember it like this:\n${updates.narrative.content.trim()}`);
      }

      const changes: string[] = [];

      if (typeof updates.goldChange === 'number' && updates.goldChange !== 0) {
        if (updates.goldChange > 0) changes.push(`I gained ${updates.goldChange} gold.`);
        else changes.push(`I spent ${Math.abs(updates.goldChange)} gold.`);
      }
      if (typeof updates.xpChange === 'number' && updates.xpChange !== 0) {
        if (updates.xpChange > 0) changes.push(`I gained ${updates.xpChange} experience.`);
        else changes.push(`I lost ${Math.abs(updates.xpChange)} experience.`);
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
  if (!currentProfileId || !currentCharacterId) {
      return (
        <CharacterSelect 
            profiles={profiles}
            characters={characters}
            onCreateProfile={handleCreateProfile}
            onCreateCharacter={handleCreateCharacter}
            onSelectProfile={(p) => setCurrentProfileId(p.id)}
            onSelectCharacter={async (cid) => {
              setCurrentCharacterId(cid);
              if (currentUser) {
                await setActiveCharacter(currentUser.uid, cid);
              }
            }}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
            onUpdateCharacter={handleUpdateCharacter}
        />
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
    }}>
      <div className="min-h-screen bg-skyrim-dark text-skyrim-text font-sans selection:bg-skyrim-gold selection:text-skyrim-dark">
        {/* Navigation Header */}
        <nav className="fixed top-0 left-0 right-0 bg-skyrim-paper/95 backdrop-blur-md border-b border-skyrim-gold/30 z-40 shadow-2xl">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2 text-skyrim-gold font-serif font-bold text-xl tracking-widest uppercase cursor-pointer" onClick={() => setCurrentCharacterId(null)}>
                <Skull size={24} />
                <span className="hidden md:inline">Skyrim Aetherius</span>
              </div>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2 relative">
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
                      className={`flex items-center gap-2 px-3 py-2 rounded transition-all duration-300 text-sm md:text-base ${
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

      </div>
    </AppContext.Provider>
  );
};

export default App;