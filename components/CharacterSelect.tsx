import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Character, SKYRIM_RACES } from '../types';
import { User, Play, Plus, Dice5, MessageSquare, Loader2, Sparkles, Send, FileText, ArrowLeft } from 'lucide-react';
import { generateCharacterProfile, chatWithScribe } from '../services/geminiService';

interface CharacterSelectProps {
  profiles: UserProfile[];
  characters: Character[];
  onSelectProfile: (profile: UserProfile) => void;
  onSelectCharacter: (characterId: string) => void;
  onCreateProfile: (name: string) => void;
  onCreateCharacter: (profileId: string, name: string, archetype: string, race: string, gender: string, fullDetails?: Partial<Character>) => void;
  onLogout: () => void;
}

const ARCHETYPES = [
    "Warrior", "Mage", "Thief", "Assassin", "Spellsword", 
    "Battlemage", "Ranger", "Barbarian", "Bard", "Necromancer", "Merchant",
    "Paladin", "Witchhunter", "Sorcerer", "Scout", "Rogue", "Healer", "Knight"
];

export const CharacterSelect: React.FC<CharacterSelectProps> = ({ 
    profiles, characters, onSelectProfile, onSelectCharacter, onCreateProfile, onCreateCharacter, onLogout 
}) => {
  const [view, setView] = useState<'profiles' | 'characters'>('profiles');
  const [creationMode, setCreationMode] = useState<'manual' | 'chat' | 'import'>('manual');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  // Manual State
  const [newName, setNewName] = useState('');
  const [newArchetype, setNewArchetype] = useState(ARCHETYPES[0]);
  const [newRace, setNewRace] = useState(SKYRIM_RACES[7]); // Default Nord
  const [newGender, setNewGender] = useState('Male');

  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', parts: [{ text: string }]}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Import State
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const selectProfile = (p: UserProfile) => {
      setSelectedProfileId(p.id);
      onSelectProfile(p);
      setView('characters');
  };

  const handleCreateProfile = () => {
    if (newName.trim()) {
        onCreateProfile(newName);
        setNewName('');
    }
  };

  const handleManualCreate = () => {
      if (selectedProfileId && newName.trim()) {
          onCreateCharacter(selectedProfileId, newName, newArchetype, newRace, newGender);
          setNewName('');
      }
  };

  const handleRandomizeFull = async () => {
      setIsGenerating(true);
      try {
          const char = await generateCharacterProfile("Create a completely random character.");
          if (char && selectedProfileId) {
              onCreateCharacter(
                  selectedProfileId, 
                  char.name || "Unknown", 
                  char.archetype || "Adventurer", 
                  char.race || "Nord",
                  char.gender || "Male",
                  char
              );
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const handleImportText = async () => {
      if (!importText.trim()) return;
      setIsGenerating(true);
      try {
          const char = await generateCharacterProfile(importText, 'text_import');
          if (char && selectedProfileId) {
              onCreateCharacter(
                  selectedProfileId, 
                  char.name || "Unknown", 
                  char.archetype || "Adventurer", 
                  char.race || "Nord",
                  char.gender || "Male",
                  char
              );
              setCreationMode('manual');
              setImportText('');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsGenerating(false);
      }
  };

  const startChat = async () => {
      setCreationMode('chat');
      setIsChatting(true);
      setChatHistory([]);
      const intro = "Greetings, traveler. I am the Scribe. I shall guide your fate. Tell me, do you seek to wield the blade, the bow, or the arcane arts?";
      setChatHistory([{ role: 'model', parts: [{ text: intro }] }]);
  };

  const sendChatMessage = async () => {
      if (!chatInput.trim()) return;
      
      const userMsg = chatInput;
      setChatInput('');
      
      // We pass the *previous* history to the API because the SDK's sendMessage appends the new one.
      const historyForApi = [...chatHistory];
      
      const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: userMsg }] }];
      setChatHistory(newHistory);
      setIsChatting(true);

      try {
          const response = await chatWithScribe(historyForApi, userMsg);
          
          if (response.includes('[[GENERATE_CHARACTER]]')) {
             // Trigger generation
             setIsGenerating(true);
             const cleanResponse = response.replace('[[GENERATE_CHARACTER]]', '').trim();
             const finalHistory = [...newHistory, { role: 'model' as const, parts: [{ text: cleanResponse }] }];
             setChatHistory(finalHistory);
             
             // Format history for the generator
             const conversationLog = finalHistory.map(msg => 
                `${msg.role === 'user' ? 'PLAYER' : 'SCRIBE'}: ${msg.parts[0].text}`
             ).join('\n\n');

             // Generate
             const char = await generateCharacterProfile(conversationLog, 'chat_result');
             if (char && selectedProfileId) {
                  onCreateCharacter(
                      selectedProfileId, 
                      char.name || "Unknown", 
                      char.archetype || "Adventurer", 
                      char.race || "Nord",
                      char.gender || "Male",
                      char
                  );
                  // Reset
                  setCreationMode('manual');
                  setChatHistory([]);
             }
             setIsGenerating(false);
          } else {
             setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: response }] }]);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsChatting(false);
      }
  };

  const displayedCharacters = characters.filter(c => c.profileId === selectedProfileId);

  return (
    <div className="min-h-screen flex items-center justify-center bg-skyrim-dark bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
        <div className="w-full max-w-4xl p-8 bg-skyrim-paper border border-skyrim-gold shadow-2xl rounded-lg flex flex-col max-h-[90vh]">
            
            <h1 className="text-3xl font-serif text-skyrim-gold text-center mb-6 border-b border-skyrim-border pb-4">
                {view === 'profiles' ? 'Select User Profile' : 'Select Character'}
            </h1>
            
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto mb-6 pr-2">
                {view === 'profiles' ? (
                    // Profile List
                    <div className="grid gap-4">
                        {profiles.map(p => (
                            <button key={p.id} onClick={() => selectProfile(p)} className="flex items-center gap-4 p-4 bg-black/40 border border-skyrim-border hover:border-skyrim-gold hover:bg-black/60 transition-all text-left">
                                <div className="w-10 h-10 bg-skyrim-gold/20 rounded-full flex items-center justify-center text-skyrim-gold">
                                    <User size={20} />
                                </div>
                                <span className="text-xl font-serif text-gray-200">{p.username}</span>
                            </button>
                        ))}
                         {profiles.length === 0 && (
                            <div className="text-center text-gray-500 italic py-8">No profiles found. Create one to begin.</div>
                        )}
                    </div>
                ) : (
                   // Character List
                   <>
                       {creationMode === 'manual' ? (
                           <div className="grid gap-4">
                                {displayedCharacters.map(c => (
                                    <button key={c.id} onClick={() => onSelectCharacter(c.id)} className="flex items-center gap-4 p-4 bg-black/40 border border-skyrim-border hover:border-skyrim-gold hover:bg-black/60 transition-all text-left group">
                                        <div className="w-12 h-12 bg-skyrim-gold/20 rounded-full flex items-center justify-center text-skyrim-gold group-hover:text-white group-hover:bg-skyrim-gold transition-colors">
                                            <Play size={24} fill="currentColor" />
                                        </div>
                                        <div>
                                            <span className="block text-xl font-serif text-skyrim-gold">{c.name}</span>
                                            <span className="text-sm text-gray-500">Lvl {c.level} {c.gender} {c.race} {c.archetype}</span>
                                        </div>
                                    </button>
                                ))}
                                {displayedCharacters.length === 0 && (
                                    <div className="text-center text-gray-500 italic py-8">No characters found for this profile.</div>
                                )}
                           </div>
                       ) : creationMode === 'chat' ? (
                           // Chat Interface
                           <div className="flex flex-col h-[400px] bg-black/30 border border-skyrim-border rounded-lg p-4">
                               <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                                   {chatHistory.map((msg, idx) => (
                                       <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                           <div className={`max-w-[80%] p-3 rounded-lg text-sm font-serif leading-relaxed ${msg.role === 'user' ? 'bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/30' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                                               {msg.parts[0].text}
                                           </div>
                                       </div>
                                   ))}
                                   {isGenerating && (
                                       <div className="flex justify-center p-4">
                                           <div className="flex items-center gap-2 text-skyrim-gold animate-pulse">
                                               <Sparkles size={16} /> Forging destiny...
                                           </div>
                                       </div>
                                   )}
                                   <div ref={chatBottomRef} />
                               </div>
                               <div className="flex gap-2">
                                   <input 
                                       className="flex-1 bg-black/50 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold"
                                       placeholder="Reply to the Scribe..."
                                       value={chatInput}
                                       onChange={e => setChatInput(e.target.value)}
                                       onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                       disabled={isGenerating}
                                   />
                                   <button 
                                      onClick={sendChatMessage} 
                                      disabled={!chatInput.trim() || isGenerating}
                                      className="p-3 bg-skyrim-gold text-skyrim-dark rounded hover:bg-skyrim-goldHover disabled:opacity-50"
                                   >
                                       <Send size={20} />
                                   </button>
                               </div>
                           </div>
                       ) : (
                           // Import Interface
                           <div className="flex flex-col h-[400px] bg-black/30 border border-skyrim-border rounded-lg p-6">
                               <h4 className="text-skyrim-gold font-serif text-lg mb-2">Import from Text</h4>
                               <p className="text-gray-400 text-sm mb-4">Paste your character backstory, description, or sheet below. The Scribe will interpret the details and fill in the blanks.</p>
                               <textarea 
                                    className="flex-1 bg-black/50 border border-skyrim-border p-4 rounded text-gray-300 focus:outline-none focus:border-skyrim-gold mb-4 font-serif leading-relaxed resize-none"
                                    placeholder="My character is a Nord warrior named Ragnar who despises magic..."
                                    value={importText}
                                    onChange={e => setImportText(e.target.value)}
                                    disabled={isGenerating}
                               />
                               <button 
                                  onClick={handleImportText}
                                  disabled={!importText.trim() || isGenerating}
                                  className="w-full py-3 bg-skyrim-gold text-skyrim-dark font-bold rounded hover:bg-skyrim-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
                               >
                                   {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                                   Generate from Text
                               </button>
                           </div>
                       )}
                   </>
                )}
            </div>

            {/* Creation Forms */}
            <div className="border-t border-skyrim-border pt-6">
                <h3 className="text-sm text-skyrim-gold uppercase tracking-widest font-bold mb-4">
                    {view === 'profiles' ? 'Create New Profile' : 'Create New Character'}
                </h3>
                
                {view === 'profiles' ? (
                     <div className="flex gap-2">
                        <input 
                           className="flex-1 bg-black/40 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold"
                           placeholder="Username"
                           value={newName}
                           onChange={e => setNewName(e.target.value)}
                       />
                       <button onClick={handleCreateProfile} disabled={!newName.trim()} className="px-6 bg-skyrim-gold hover:bg-skyrim-goldHover text-skyrim-dark font-bold rounded flex items-center gap-2 disabled:opacity-50">
                           <Plus size={20} /> Create
                       </button>
                   </div>
                ) : (
                    // Character Creation Controls
                    <>
                        {creationMode === 'manual' ? (
                             <div className="flex flex-col gap-4">
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-[2] bg-black/40 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold"
                                        placeholder="Character Name"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                     <select 
                                        value={newGender}
                                        onChange={(e) => setNewGender(e.target.value)}
                                        className="bg-black/40 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold text-sm"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                    <select 
                                        value={newRace}
                                        onChange={(e) => setNewRace(e.target.value)}
                                        className="bg-black/40 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold text-sm"
                                    >
                                        {SKYRIM_RACES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <select 
                                        value={newArchetype} 
                                        onChange={(e) => setNewArchetype(e.target.value)}
                                        className="bg-black/40 border border-skyrim-border p-3 rounded text-gray-200 focus:outline-none focus:border-skyrim-gold text-sm"
                                    >
                                        {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                
                                <div className="flex gap-3 flex-wrap md:flex-nowrap">
                                    <button onClick={handleManualCreate} disabled={!newName.trim()} className="flex-1 py-3 bg-skyrim-gold hover:bg-skyrim-goldHover text-skyrim-dark font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap px-4">
                                        <Plus size={20} /> Quick Create
                                    </button>
                                    
                                    <button onClick={handleRandomizeFull} disabled={isGenerating} className="flex-1 py-3 bg-skyrim-accent hover:bg-skyrim-accent/80 text-white font-bold rounded flex items-center justify-center gap-2 border border-skyrim-border whitespace-nowrap px-4">
                                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Dice5 size={20} />} 
                                        Full Random
                                    </button>

                                    <button onClick={startChat} className="flex-1 py-3 bg-skyrim-dark hover:bg-black text-skyrim-gold font-bold rounded flex items-center justify-center gap-2 border border-skyrim-gold whitespace-nowrap px-4">
                                        <MessageSquare size={20} /> Scribe Chat
                                    </button>

                                    <button onClick={() => setCreationMode('import')} className="flex-1 py-3 bg-skyrim-dark hover:bg-black text-gray-300 font-bold rounded flex items-center justify-center gap-2 border border-gray-600 whitespace-nowrap px-4">
                                        <FileText size={20} /> Import Text
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <button onClick={() => setCreationMode('manual')} className="w-full py-2 flex items-center justify-center gap-2 text-gray-500 hover:text-skyrim-gold text-sm">
                                <ArrowLeft size={16} /> Return to Character List
                             </button>
                        )}
                    </>
                )}
            </div>

            {view === 'characters' && (
                <button onClick={() => setView('profiles')} className="mt-4 text-xs text-gray-500 hover:text-skyrim-gold w-full text-center">
                    &larr; Switch Profile
                </button>
            )}

            {/* Logout */}
            <button onClick={onLogout} className="mt-2 text-xs text-red-500 hover:text-red-300 w-full text-center">
                &larr; Back to Login
            </button>
        </div>
    </div>
  );
};