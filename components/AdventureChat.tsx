import React, { useState, useRef, useEffect } from 'react';
import { Character, InventoryItem, CustomQuest, JournalEntry, StoryChapter, GameStateUpdate } from '../types';
import { Send, Loader2, Swords, User, Scroll, RefreshCw, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { PreferredAIModel } from '../services/geminiService';

interface ChatMessage {
  id: string;
  role: 'player' | 'gm';
  content: string;
  timestamp: number;
  updates?: GameStateUpdate;
}

interface AdventureChatProps {
  userId?: string | null;
  model?: PreferredAIModel | string;
  character: Character | null;
  inventory: InventoryItem[];
  quests: CustomQuest[];
  journal: JournalEntry[];
  story: StoryChapter[];
  onUpdateState: (updates: GameStateUpdate) => void;
}

const SYSTEM_PROMPT = `You are an immersive Game Master (GM) for a text-based Skyrim adventure. You control the world, NPCs, enemies, and outcomes. The player controls their character's actions.

RULES:
1. Always stay in character as a Skyrim GM. Use Tamrielic lore, locations, factions, and NPCs.
2. Describe scenes vividly but concisely (2-4 paragraphs max).
3. React to player actions realistically. Combat has consequences. Choices matter.
4. Introduce challenges, NPCs, and plot hooks naturally.
5. Track the flow of the adventure and maintain continuity.
6. If the player does something impossible or lore-breaking, gently redirect them.
7. End responses with a clear situation the player can respond to.

RESPONSE FORMAT:
Return ONLY a JSON object:
{
  "narrative": { "title": "Short title", "content": "Your story response here..." },
  "newItems": [{ "name": "Item", "type": "misc", "description": "...", "quantity": 1 }],
  "newQuests": [{ "title": "Quest", "description": "...", "location": "..." }],
  "updateQuests": [{ "title": "Quest Title", "status": "completed" }],
  "goldChange": 0,
  "statUpdates": {}
}

Only include fields that changed. The narrative field is always required.`;

export const AdventureChat: React.FC<AdventureChatProps> = ({
  userId,
  model,
  character,
  inventory,
  quests,
  journal,
  story,
  onUpdateState
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = character ? `aetherius:adventureChat:${character.id}` : '';

  useEffect(() => {
    if (!character) return;

    // Prefer Firestore sync when authenticated
    if (userId) {
      (async () => {
        try {
          const { loadAdventureMessages } = await import('../services/firestore');
          const loaded = await loadAdventureMessages(userId, character.id);
          if (Array.isArray(loaded)) {
            setMessages(loaded as unknown as ChatMessage[]);
          }
        } catch (e) {
          console.warn('Failed to load adventure messages from Firestore; falling back to local storage.', e);
          try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setMessages(parsed);
          } catch {
            // ignore
          }
        }
      })();
      return;
    }

    // Local-only persistence
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, userId]);

  useEffect(() => {
    if (!character) return;
    if (userId) return; // Firestore handles persistence
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, character, storageKey, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContext = () => {
    if (!character) return '';
    return JSON.stringify({
      character: {
        name: character.name,
        race: character.race,
        gender: character.gender,
        archetype: character.archetype,
        level: character.level,
        stats: character.stats,
        identity: character.identity,
        psychology: character.psychology,
        moralCode: character.moralCode,
        allowedActions: character.allowedActions,
        forbiddenActions: character.forbiddenActions,
        skills: character.skills?.slice(0, 6),
      },
      inventory: inventory.slice(0, 25).map(i => ({ name: i.name, type: i.type, qty: i.quantity })),
      quests: quests.slice(0, 20).map(q => ({ title: q.title, status: q.status, location: q.location, description: q.description })),
      journal: journal.slice(-10).map(j => ({ date: j.date, title: j.title, content: j.content.substring(0, 400) })),
      story: story.slice(-5).map(s => ({ title: s.title, summary: s.summary, date: s.date })),
      recentChat: messages.slice(-8).map(m => ({ role: m.role, content: m.content.substring(0, 250) }))
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !character) return;

    const playerMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'player',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, playerMessage]);
    setInput('');
    setLoading(true);

    if (userId) {
      void import('../services/firestore')
        .then(m => m.saveAdventureMessage(userId, character.id, playerMessage))
        .catch(e => console.warn('Failed to save player message to Firestore', e));
    }

    try {
      const { generateAdventureResponse } = await import('../services/geminiService');
      const context = buildContext();
      const result = await generateAdventureResponse(input.trim(), context, SYSTEM_PROMPT, { model });
      
      const gmMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'gm',
        content: result.narrative?.content || 'The winds of fate are silent...',
        timestamp: Date.now(),
        updates: result
      };

      setMessages(prev => [...prev, gmMessage]);

      if (userId) {
        void import('../services/firestore')
          .then(m => m.saveAdventureMessage(userId, character.id, gmMessage))
          .catch(e => console.warn('Failed to save GM message to Firestore', e));
      }

      // Auto-apply game state changes if enabled
      if (autoApply && result) {
        onUpdateState(result);
      }
    } catch (error) {
      console.error('Adventure chat error:', error);
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'gm',
        content: '*The connection to Aetherius wavers...* (Error generating response. Please try again.)',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);

      if (userId) {
        void import('../services/firestore')
          .then(m => m.saveAdventureMessage(userId, character.id, errorMessage))
          .catch(e => console.warn('Failed to save error message to Firestore', e));
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewAdventure = () => {
    if (!character) return;
    const intro: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'gm',
      content: `*The mists of time part before you...*\n\nWelcome, ${character.name}, ${character.race} ${character.archetype}. The land of Skyrim stretches before you, cold and unforgiving, yet ripe with opportunity.\n\nYou find yourself at a crossroads. The cobblestones beneath your feet are worn by centuries of travelers. To the north, smoke rises from a small village. To the east, a dark forest looms. A weathered signpost creaks in the wind.\n\n*What do you do?*`,
      timestamp: Date.now()
    };
    setMessages([intro]);

    if (userId) {
      void import('../services/firestore')
        .then(async m => {
          await m.clearAdventureMessages(userId, character.id);
          await m.saveAdventureMessage(userId, character.id, intro);
        })
        .catch(e => console.warn('Failed to reset adventure messages in Firestore', e));
    }
  };

  const clearChat = () => {
    if (confirm('Clear all messages and start fresh?')) {
      setMessages([]);

      if (userId && character) {
        void import('../services/firestore')
          .then(m => m.clearAdventureMessages(userId, character.id))
          .catch(e => console.warn('Failed to clear adventure messages in Firestore', e));
      }
    }
  };

  const applyUpdates = (updates: GameStateUpdate) => {
    const toApply: GameStateUpdate = {};
    if (updates.newItems?.length) toApply.newItems = updates.newItems;
    if (updates.newQuests?.length) toApply.newQuests = updates.newQuests;
    if (updates.updateQuests?.length) toApply.updateQuests = updates.updateQuests;
    if (updates.goldChange) toApply.goldChange = updates.goldChange;
    if (updates.statUpdates && Object.keys(updates.statUpdates).length) toApply.statUpdates = updates.statUpdates;
    
    if (Object.keys(toApply).length > 0) {
      onUpdateState(toApply);
    }
  };

  if (!character) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4">
        <div className="text-center py-20 text-gray-500">
          <Swords size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a character to begin your adventure.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4">
      {/* Header */}
      <div className="mb-6 p-4 sm:p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2 flex items-center justify-center gap-3">
          <Swords size={32} />
          Adventure
        </h1>
        <p className="text-gray-500 font-sans text-sm">A text-based journey through Skyrim</p>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={startNewAdventure}
            className="px-3 py-2 bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/50 rounded hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} /> New Adventure
          </button>
          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="px-3 py-2 text-gray-400 border border-gray-600 rounded hover:text-red-400 hover:border-red-400 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-2 text-gray-400 border border-gray-600 rounded hover:text-skyrim-gold hover:border-skyrim-gold transition-colors flex items-center gap-2 text-sm"
        >
          <Settings size={14} /> Settings {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-black/40 border border-skyrim-border rounded animate-in fade-in">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={() => setAutoApply(!autoApply)}
              className="accent-skyrim-gold w-4 h-4"
            />
            <span className="text-sm text-gray-300">Auto-apply game changes (items, quests, gold)</span>
          </label>
        </div>
      )}

      {/* Chat Messages */}
      <div className="bg-black/30 border border-skyrim-border rounded-lg mb-4 min-h-[400px] max-h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
            <Scroll size={48} className="mb-4 opacity-50" />
            <p className="text-center mb-4">Your adventure awaits...</p>
            <button
              onClick={startNewAdventure}
              className="px-4 py-2 bg-skyrim-gold text-skyrim-dark font-bold rounded hover:bg-skyrim-goldHover transition-colors"
            >
              Begin Your Journey
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'player' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  msg.role === 'player' 
                    ? 'bg-blue-900/50 text-blue-400 border border-blue-700' 
                    : 'bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/50'
                }`}>
                  {msg.role === 'player' ? <User size={18} /> : <Swords size={18} />}
                </div>
                <div className={`flex-1 max-w-[80%] ${msg.role === 'player' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    msg.role === 'player'
                      ? 'bg-blue-900/30 border border-blue-800 text-gray-200'
                      : 'bg-skyrim-paper/60 border border-skyrim-border text-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  
                  {/* Game state changes indicator */}
                  {msg.role === 'gm' && msg.updates && !autoApply && (
                    <div className="mt-2 p-2 bg-black/40 rounded border border-skyrim-border/50 text-xs">
                      {msg.updates.newItems?.length ? (
                        <div className="text-green-400">+ {msg.updates.newItems.length} item(s) found</div>
                      ) : null}
                      {msg.updates.newQuests?.length ? (
                        <div className="text-skyrim-gold">+ {msg.updates.newQuests.length} quest(s) started</div>
                      ) : null}
                      {msg.updates.goldChange ? (
                        <div className="text-yellow-400">{msg.updates.goldChange > 0 ? '+' : ''}{msg.updates.goldChange} gold</div>
                      ) : null}
                      <button
                        onClick={() => applyUpdates(msg.updates!)}
                        className="mt-1 px-2 py-1 bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/50 rounded text-xs hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors"
                      >
                        Apply Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-skyrim-paper/60 border border-skyrim-border rounded-lg p-3">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you do? (Press Enter to send)"
            disabled={loading || messages.length === 0}
            className="flex-1 bg-black/30 border border-skyrim-border rounded p-3 text-gray-200 placeholder-gray-500 resize-none focus:border-skyrim-gold focus:outline-none disabled:opacity-50 font-serif"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || messages.length === 0}
            className="px-4 bg-skyrim-gold hover:bg-skyrim-goldHover disabled:opacity-50 disabled:cursor-not-allowed text-skyrim-dark font-bold rounded flex items-center justify-center transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: Describe your actions in detail for richer responses. "I search the chest" → "I carefully examine the ancient chest for traps before attempting to pick the lock."
        </p>
      </div>
    </div>
  );
};
