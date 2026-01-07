import React, { useState, useEffect } from 'react';
import { 
    INITIAL_CHARACTER_TEMPLATE, Character, CustomQuest, JournalEntry, UserProfile, InventoryItem, StoryChapter, GameStateUpdate, GeneratedCharacterData 
} from './types';
import { CharacterSheet } from './components/CharacterSheet';
import { QuestLog } from './components/QuestLog';
import { Journal } from './components/Journal';
import { Inventory } from './components/Inventory';
import { StoryLog } from './components/StoryLog';
import { AIScribe } from './components/AIScribe';
import { CharacterSelect } from './components/CharacterSelect';
import { User, Scroll, BookOpen, Skull, Package, Feather, LogOut, Users, Loader } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  auth, 
  database,
  onAuthChange, 
  registerUser, 
  loginUser, 
  logoutUser,
  subscribeToUserData,
  updateUserData
} from './services/firebase';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

const TABS = {
  CHARACTER: 'character',
  INVENTORY: 'inventory',
  QUESTS: 'quests',
  STORY: 'story',
  JOURNAL: 'journal'
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

  // Global State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quests, setQuests] = useState<CustomQuest[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [storyChapters, setStoryChapters] = useState<StoryChapter[]>([]);

  // Session State
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(TABS.CHARACTER);

  // Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        // Kullanıcı giriş yaptı, verilerini Firebase'den yükle
        subscribeToUserData(user.uid, (data) => {
          if (data) {
            setProfiles(data.profiles || []);
            setCharacters(data.characters || []);
            setItems(data.items || []);
            setQuests(data.quests || []);
            setJournalEntries(data.journalEntries || []);
            setStoryChapters(data.storyChapters || []);
          }
        });
      } else {
        // Kullanıcı çıkış yaptı, local state'i temizle
        setProfiles([]);
        setCharacters([]);
        setItems([]);
        setQuests([]);
        setJournalEntries([]);
        setStoryChapters([]);
        setCurrentProfileId(null);
        setCurrentCharacterId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firebase'e veri kaydetme
  useEffect(() => {
    if (!currentUser) return;
    
    const gameState: AppGameState = {
      profiles,
      characters,
      items,
      quests,
      journalEntries,
      storyChapters
    };
    
    updateUserData(currentUser.uid, gameState);
  }, [profiles, characters, items, quests, journalEntries, storyChapters, currentUser]);

  // Actions
  const handleCreateProfile = (name: string) => {
      const newProfile: UserProfile = { id: uniqueId(), username: name, created: Date.now() };
      setProfiles([...profiles, newProfile]);
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-skyrim-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="animate-spin text-skyrim-gold" size={48} />
          <p className="text-skyrim-text">Yükleniyor...</p>
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
          <p className="text-skyrim-text text-center mb-6">Aetherius'a Hoş Geldiniz</p>
          
          {authError && (
            <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-4 text-red-200 text-sm">
              {authError}
            </div>
          )}
          
          <div className="space-y-4">
            <input 
              type="email"
              placeholder="E-posta"
              className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            <input 
              type="password"
              placeholder="Şifre"
              className="w-full px-4 py-2 bg-skyrim-dark/50 border border-skyrim-gold/30 rounded text-skyrim-text placeholder-gray-500 focus:outline-none focus:border-skyrim-gold"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
            
            <button 
              onClick={() => handleLogin(loginEmail, loginPassword)}
              className="w-full bg-skyrim-gold text-skyrim-dark font-bold py-2 rounded hover:bg-yellow-400 transition-colors"
            >
              Giriş Yap
            </button>
            
            <button 
              onClick={() => handleRegister(loginEmail, loginPassword)}
              className="w-full bg-skyrim-gold/20 text-skyrim-gold font-bold py-2 rounded border border-skyrim-gold hover:bg-skyrim-gold/30 transition-colors"
            >
              Kayıt Ol
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-6">
            Demo amaçlı test e-postaları: test@example.com
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
          ...fullDetails, // Spread properties like backstory, stats, skills
          gold: fullDetails?.startingGold || 0,
          lastPlayed: Date.now()
      };
      setCharacters([...characters, newChar]);

      // 2. Inventory
      if (fullDetails?.inventory) {
          const newItems: InventoryItem[] = fullDetails.inventory.map(i => ({
              id: uniqueId(),
              characterId: charId, // Implicit prop handled by filter later if strict typing allowed it
              name: i.name,
              type: i.type as any,
              description: i.description,
              quantity: i.quantity,
              equipped: false
          }));
          // Hack: we store characterId on items implicitly even if interface doesn't strictly enforce it in some views
          // In a real app we would update the type definition or use a relational ID.
          // For now, let's append them to global items list with a hidden property if needed, 
          // or rely on the fact that we filter items by checking a property.
          // NOTE: The `InventoryItem` type in `types.ts` doesn't have `characterId`, 
          // but we use `getCharacterItems` filtering by it. 
          // We must ensure the object saved has it.
          const itemsWithId = newItems.map(i => ({...i, characterId: charId}));
          setItems(prev => [...prev, ...itemsWithId as any]);
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
      }

      // 4. Journal
      if (fullDetails?.journalEntries) {
          // Note: JournalEntry in types doesn't have characterId, assuming global for simplicity or needs update
          // If the app architecture implies journal is per character (which it should), we need to handle that filter.
          // Currently Journal component takes `entries` prop. 
          // Let's add characterId to the saved object effectively.
          const newEntries = fullDetails.journalEntries.map(e => ({
              id: uniqueId(),
              characterId: charId,
              date: "4E 201",
              title: e.title,
              content: e.content
          }));
          setJournalEntries(prev => [...prev, ...newEntries as any]);
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
      }
  };

  const updateCharacter = (field: keyof Character, value: any) => {
      setCharacters(prev => prev.map(c => c.id === currentCharacterId ? { ...c, [field]: value } : c));
  };

  const updateStoryChapter = (updatedChapter: StoryChapter) => {
      setStoryChapters(prev => prev.map(c => c.id === updatedChapter.id ? updatedChapter : c));
  };
  
  // Helper to get active data
  const activeCharacter = characters.find(c => c.id === currentCharacterId);
  const getCharacterItems = () => items.filter((i: any) => i.characterId === currentCharacterId);
  
  const setCharacterItems = (newCharItems: InventoryItem[]) => {
      const others = items.filter((i: any) => i.characterId !== currentCharacterId);
      const taggedItems = newCharItems.map(i => ({ ...i, characterId: currentCharacterId }));
      setItems([...others, ...taggedItems]);
  };

  const getCharacterQuests = () => quests.filter(q => q.characterId === currentCharacterId);
  const setCharacterQuests = (newQuests: CustomQuest[]) => {
      const others = quests.filter(q => q.characterId !== currentCharacterId);
      const tagged = newQuests.map(q => ({ ...q, characterId: currentCharacterId }));
      setQuests([...others, ...tagged]);
  };

  const getCharacterStory = () => storyChapters.filter(s => s.characterId === currentCharacterId);
  
  // Cast generic entries to include characterId check
  const getCharacterJournal = () => journalEntries.filter((j: any) => j.characterId === currentCharacterId);
  const setCharacterJournal = (newEntries: JournalEntry[]) => {
      const others = journalEntries.filter((j: any) => j.characterId !== currentCharacterId);
      const tagged = newEntries.map(e => ({ ...e, characterId: currentCharacterId }));
      setJournalEntries([...others, ...tagged]);
  };

  // AI Game Master Integration
  const handleGameUpdate = (updates: GameStateUpdate) => {
      if (!currentCharacterId || !activeCharacter) return;

      // 1. Narrative -> Story Chapter
      if (updates.narrative) {
          const chapter: StoryChapter = {
              id: uniqueId(),
              characterId: currentCharacterId,
              title: updates.narrative.title,
              content: updates.narrative.content,
              date: "4E 201", // TODO: dynamic date
              summary: updates.narrative.title,
              createdAt: Date.now()
          };
          setStoryChapters(prev => [...prev, chapter]);
      }

      // 2. New Quests
      if (updates.newQuests) {
          const addedQuests = updates.newQuests.map(q => ({
              id: uniqueId(),
              characterId: currentCharacterId,
              title: q.title,
              description: q.description,
              location: q.location,
              objectives: [],
              status: 'active' as const,
              createdAt: Date.now()
          }));
          setQuests(prev => [...prev, ...addedQuests]);
      }

      // 3. Update Quests
      if (updates.updateQuests) {
          setQuests(prev => prev.map(q => {
              if (q.characterId !== currentCharacterId) return q;
              const update = updates.updateQuests?.find(u => u.title.toLowerCase() === q.title.toLowerCase());
              if (update) {
                  return { ...q, status: update.status };
              }
              return q;
          }));
      }

      // 4. New Items
      if (updates.newItems) {
           const addedItems = updates.newItems.map(i => ({
               id: uniqueId(),
               characterId: currentCharacterId, // Implicit prop
               name: i.name,
               type: i.type as any, // unsafe cast for simplicity
               description: i.description,
               quantity: i.quantity,
               equipped: false
           }));
           setItems(prev => [...prev, ...addedItems]);
      }

      // 5. Stats
      if (updates.statUpdates) {
          setCharacters(prev => prev.map(c => {
              if (c.id !== currentCharacterId) return c;
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
              return { ...c, gold: (c.gold || 0) + (updates.goldChange || 0) };
         }));
      }

      // 7. Auto-Journal (Optional: Log the event)
      const entry: JournalEntry = {
          id: uniqueId(),
          date: "4E 201",
          title: updates.narrative?.title || "Event",
          content: `The Game Master decreed: ${updates.narrative?.title}`
      };
      // implicit characterId handling via casting
      setJournalEntries(prev => [...prev, { ...entry, characterId: currentCharacterId } as any]); 
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

  // Kimlik Doğrulama Fonksiyonları
  async function handleRegister(email: string, password: string) {
    setAuthError(null);
    try {
      if (!email || !password) {
        setAuthError('E-posta ve şifre gereklidir');
        return;
      }
      if (password.length < 6) {
        setAuthError('Şifre en az 6 karakter olmalıdır');
        return;
      }
      await registerUser(email, password);
      setLoginEmail('');
      setLoginPassword('');
      setAuthError(null);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('Bu e-posta zaten kullanımda');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Geçersiz e-posta adresi');
      } else {
        setAuthError('Kayıt başarısız oldu: ' + error.message);
      }
    }
  };

  async function handleLogin(email: string, password: string) {
    setAuthError(null);
    try {
      if (!email || !password) {
        setAuthError('E-posta ve şifre gereklidir');
        return;
      }
      await loginUser(email, password);
      setLoginEmail('');
      setLoginPassword('');
      setAuthError(null);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setAuthError('Bu e-posta için kullanıcı bulunamadı');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Yanlış şifre');
      } else {
        setAuthError('Giriş başarısız: ' + error.message);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentProfileId(null);
      setCurrentCharacterId(null);
    } catch (error) {
      setAuthError('Çıkış yapılamadı');
    }
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
            onSelectCharacter={(cid) => setCurrentCharacterId(cid)}
        />
      );
  }

  return (
    <div className="min-h-screen bg-skyrim-dark text-skyrim-text font-sans selection:bg-skyrim-gold selection:text-skyrim-dark">
      
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 bg-skyrim-paper/95 backdrop-blur-md border-b border-skyrim-gold/30 z-40 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 text-skyrim-gold font-serif font-bold text-xl tracking-widest uppercase cursor-pointer" onClick={() => setCurrentCharacterId(null)}>
              <Skull size={24} />
              <span className="hidden md:inline">Skyrim Aetherius</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                  { id: TABS.CHARACTER, icon: User, label: 'Hero' },
                  { id: TABS.INVENTORY, icon: Package, label: 'Items' },
                  { id: TABS.QUESTS, icon: Scroll, label: 'Quests' },
                  { id: TABS.STORY, icon: Feather, label: 'Story' },
                  { id: TABS.JOURNAL, icon: BookOpen, label: 'Journal' },
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

              <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block"></div>
              
              <button 
                onClick={() => setCurrentCharacterId(null)}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded text-sm transition-colors"
                title="Switch Character"
              >
                  <Users size={16} />
                  <span className="hidden lg:inline">Switch</span>
              </button>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-200 hover:bg-red-900/20 rounded text-sm transition-colors"
                title="Çıkış Yap"
              >
                  <LogOut size={16} />
                  <span className="hidden lg:inline">Çıkış</span>
              </button>

            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 px-4 min-h-screen pb-20">
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
            <StoryLog chapters={getCharacterStory()} onUpdateChapter={updateStoryChapter} />
          )}
          {activeTab === TABS.JOURNAL && (
            <Journal entries={getCharacterJournal()} setEntries={setCharacterJournal} />
          )}
        </div>
      </main>

      {/* AI Game Master */}
      <AIScribe contextData={getAIContext()} onUpdateState={handleGameUpdate} />

    </div>
  );
};

export default App;