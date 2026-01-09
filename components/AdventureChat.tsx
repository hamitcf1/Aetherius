import React, { useState, useRef, useEffect } from 'react';
import { Character, InventoryItem, CustomQuest, JournalEntry, StoryChapter, GameStateUpdate } from '../types';
import { Send, Loader2, Swords, User, Scroll, RefreshCw, Trash2, Settings, ChevronDown, ChevronUp, X, AlertTriangle, Users } from 'lucide-react';
import type { PreferredAIModel } from '../services/geminiService';
import { getSimulationManager, processAISimulationUpdate, SimulationStateManager, NPC, PlayerFact } from '../services/stateManager';

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

CORE RULES:
1. Always stay in character as a Skyrim GM. Use Tamrielic lore, locations, factions, and NPCs.
2. Describe scenes vividly but concisely (2-4 paragraphs max).
3. React to player actions realistically. Combat has consequences. Choices matter.
4. Introduce challenges, NPCs, and plot hooks naturally.
5. Track the flow of the adventure and maintain continuity.
6. If the player does something impossible or lore-breaking, gently redirect them.
7. End responses with a clear situation the player can respond to.

=== SIMULATION STATE RULES (CRITICAL) ===

NPC IDENTITY CONSISTENCY:
- When an NPC is introduced, their name and role are PERMANENT
- NEVER change an NPC's name or role mid-scene
- Reference NPCs by their established name consistently
- If an NPC is listed in PRESENT NPCs, use their exact name and role

SCENE STATE MACHINE:
- Scenes progress through phases: exploration → encounter → questioning → negotiation/confrontation → resolution → exit
- Track the current phase and advance it based on player actions
- Do NOT reset scenes or restart dialogue without player request
- Each interaction should ADVANCE the situation, not loop

PLAYER FACT MEMORY:
- If the player has ESTABLISHED FACTS listed, DO NOT ask for that information again
- NPCs who have been told a fact should REMEMBER it
- Reference known facts naturally in dialogue
- Only contradict established facts if the player explicitly lies

CONSEQUENCE ENFORCEMENT:
- When tension with an NPC exceeds their tolerance, TRIGGER a consequence
- Do not allow infinite escalation - force a resolution
- Consequences include: entry granted, entry denied, arrest, combat, retreat
- Once a scene is resolved, move forward - don't replay it

DIALOGUE OPTION PRUNING:
- Do not offer dialogue options for topics already resolved
- If the player has explained something, don't show "Explain X" again
- Track exhausted options and don't repeat them

WORLD AUTHORITY:
- Riverwood has NO Jarl (it's a village under Whiterun's jurisdiction)
- Only Hold capitals have Jarls
- Use canonical Skyrim lore unless specifically told otherwise

RESPONSE FORMAT:
Return ONLY a JSON object:
{
  "narrative": { "title": "Short title", "content": "Your story response here..." },
  "newItems": [{ "name": "Item", "type": "misc", "description": "...", "quantity": 1 }],
  "removedItems": [{ "name": "Item", "quantity": 1 }],
  "newQuests": [{ "title": "Quest", "description": "...", "location": "...", "dueDate": "...", "objectives": [{ "description": "...", "completed": false }] }],
  "updateQuests": [{ "title": "Quest Title", "status": "completed" }],
  "goldChange": 0,
  "statUpdates": {},
  "timeAdvanceMinutes": 0,
  "needsChange": { "hunger": 0, "thirst": 0, "fatigue": 0 },
  "choices": [
    { "label": "Short option shown as a button", "playerText": "Exact text to send as the player's next message", "topic": "optional_topic_key" }
  ],
  "simulationUpdate": {
    "npcsIntroduced": [{ "name": "Guard Captain Hrolf", "role": "City Guard Captain", "disposition": "wary", "description": "A weathered Nord in steel plate" }],
    "npcUpdates": [{ "name": "Guard Captain Hrolf", "tensionChange": 10, "newKnowledge": { "player_profession": "alchemist" } }],
    "sceneStart": { "type": "checkpoint", "location": "Whiterun Gates" },
    "phaseChange": "questioning",
    "sceneResolution": "success",
    "topicsResolved": ["profession", "travel_purpose"],
    "optionsExhausted": ["Explain I'm an alchemist"],
    "factsEstablished": [{ "category": "identity", "key": "profession", "value": "alchemist", "disclosedToNPCs": ["Guard Captain Hrolf"] }],
    "newConsequences": [{ "type": "entry_denied", "description": "Guards will not allow entry", "triggerCondition": { "tensionThreshold": 80 } }]
  }
}

SIMULATION UPDATE GUIDELINES:
- npcsIntroduced: Add when a new named NPC enters the scene
- npcUpdates: Use for tension changes (+10 for suspicion, -10 for trust), disposition shifts, new knowledge
- sceneStart: Use when entering a new location or encounter type
- phaseChange: Advance the phase based on what's happening
- sceneResolution: Set when an encounter concludes
- topicsResolved: Mark topics that have been fully addressed
- factsEstablished: When player reveals information about themselves
- newConsequences: Set up triggers for automatic outcomes

Only include fields that changed. The narrative field is always required.`;

// Builds the enhanced system prompt with simulation context
const buildSimulationSystemPrompt = (simulationContext: string): string => {
  if (!simulationContext || simulationContext.trim() === '') {
    return SYSTEM_PROMPT;
  }
  
  return `${SYSTEM_PROMPT}

=== ACTIVE SIMULATION STATE ===
${simulationContext}
=== END SIMULATION STATE ===

IMPORTANT: The above simulation state shows:
- Which NPCs are present and their current tension/disposition
- What facts the player has already established (DO NOT RE-ASK)
- What topics have been resolved (DO NOT REPEAT)
- What consequences are pending (ENFORCE THEM)

Maintain consistency with this state. Do not contradict it.`;
};

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
  const [showModelTip, setShowModelTip] = useState(true);
  const [showSimulationPanel, setShowSimulationPanel] = useState(false);
  const [simulationWarnings, setSimulationWarnings] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const simulationManagerRef = useRef<SimulationStateManager | null>(null);

  const storageKey = character ? `aetherius:adventureChat:${character.id}` : '';

  const hasEstablishedState = Boolean(
    character &&
      (
        (story?.length || 0) > 0 ||
        (journal?.length || 0) > 0 ||
        (quests?.length || 0) > 0 ||
        (inventory?.length || 0) > 0 ||
        Boolean((character.identity || '').trim())
      )
  );

  // Initialize simulation state manager
  useEffect(() => {
    if (!character) {
      simulationManagerRef.current = null;
      return;
    }

    const manager = getSimulationManager(character.id, userId || null);
    simulationManagerRef.current = manager;
    
    // Load simulation state
    manager.load().catch(e => {
      console.warn('Failed to load simulation state:', e);
    });

    // Cleanup: save on unmount
    return () => {
      manager.forceSave().catch(e => {
        console.warn('Failed to save simulation state on unmount:', e);
      });
    };
  }, [character?.id, userId]);

  useEffect(() => {
    const key = userId ? `aetherius:hideAdventureModelTip:${userId}` : 'aetherius:hideAdventureModelTip';
    try {
      setShowModelTip(localStorage.getItem(key) !== '1');
    } catch {
      setShowModelTip(true);
    }
  }, [userId]);

  const dismissModelTip = () => {
    setShowModelTip(false);
    const key = userId ? `aetherius:hideAdventureModelTip:${userId}` : 'aetherius:hideAdventureModelTip';
    try {
      localStorage.setItem(key, '1');
    } catch {
      // ignore
    }
  };

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
    
    // Get simulation context if available
    const simulationContext = simulationManagerRef.current?.buildContext() || '';
    
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
      storySnippets: story.slice(-2).map(s => ({ title: s.title, content: s.content.substring(0, 600) })),
      recentChat: messages.slice(-8).map(m => ({ role: m.role, content: m.content.substring(0, 250) })),
      simulationState: simulationContext
    });
  };

  // Get the dynamic system prompt with simulation context
  const getSystemPrompt = (): string => {
    const simulationContext = simulationManagerRef.current?.buildContext() || '';
    return buildSimulationSystemPrompt(simulationContext);
  };

  const formatList = (items: string[], max: number) => {
    const trimmed = items.filter(Boolean).slice(0, max);
    if (trimmed.length === 0) return '';
    return trimmed.join(', ') + (items.length > max ? ', …' : '');
  };

  const snippet = (text: string, maxLen: number) => {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen).trimEnd() + '…';
  };

  const buildContextualIntro = (): string => {
    if (!character) return '';

    const lastChapter = story.slice(-1)[0];
    const lastJournal = journal.slice(-1)[0];
    const activeQuests = quests.filter(q => q.status === 'active');

    const questLine = activeQuests.length
      ? `Active quests: ${formatList(activeQuests.map(q => q.title), 4)}.`
      : '';

    const itemsLine = inventory.length
      ? `Notable gear: ${formatList(
          inventory
            .filter(i => (i.quantity || 0) > 0)
            .slice(0, 8)
            .map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`),
          6
        )}.`
      : '';

    const identityLine = character.identity ? snippet(character.identity, 180) : '';

    // If we have no prior state at all, fall back to the classic opener.
    const hasEstablishedState = Boolean(lastChapter || lastJournal || activeQuests.length || inventory.length || identityLine);
    if (!hasEstablishedState) {
      return `*The mists of time part before you...*\n\nWelcome, ${character.name}, ${character.race} ${character.archetype}. The land of Skyrim stretches before you, cold and unforgiving, yet ripe with opportunity.\n\nYou find yourself at a crossroads. The cobblestones beneath your feet are worn by centuries of travelers. To the north, smoke rises from a small village. To the east, a dark forest looms. A weathered signpost creaks in the wind.\n\n*What do you do?*`;
    }

    const recapParts: string[] = [];
    if (lastChapter) {
      recapParts.push(`Last chapter: “${lastChapter.title}”. ${snippet(lastChapter.content, 320)}`);
    } else if (lastJournal) {
      recapParts.push(`Last journal entry: “${lastJournal.title}”. ${snippet(lastJournal.content, 320)}`);
    }
    if (questLine) recapParts.push(questLine);
    if (itemsLine) recapParts.push(itemsLine);
    if (identityLine) recapParts.push(`You remind yourself who you are: ${identityLine}`);

    const recap = recapParts.join('\n\n');
    return `*You draw a slow breath and feel Skyrim’s cold air bite at your lungs...*\n\n${recap}\n\nThe world hasn’t reset—only turned another page.\n\n*What do you do next?*`;
  };

  const sendPlayerText = async (text: string) => {
    const trimmed = (text || '').trim();
    if (!trimmed || loading || !character) return;

    const playerMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'player',
      content: trimmed,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, playerMessage]);
    setInput('');
    setLoading(true);
    setSimulationWarnings([]); // Clear previous warnings

    if (userId) {
      void import('../services/firestore')
        .then(m => m.saveAdventureMessage(userId, character.id, playerMessage))
        .catch(e => console.warn('Failed to save player message to Firestore', e));
    }

    try {
      const { generateAdventureResponse } = await import('../services/geminiService');
      const context = buildContext();
      const systemPrompt = getSystemPrompt(); // Use dynamic system prompt with simulation context
      const result = await generateAdventureResponse(trimmed, context, systemPrompt, { model });
      
      // Process simulation state updates if present
      if (result.simulationUpdate && simulationManagerRef.current) {
        const { warnings, appliedChanges } = processAISimulationUpdate(
          simulationManagerRef.current,
          result.simulationUpdate
        );
        
        if (warnings.length > 0) {
          setSimulationWarnings(warnings);
          console.warn('Simulation warnings:', warnings);
        }
        
        if (appliedChanges.length > 0) {
          console.log('Simulation changes applied:', appliedChanges);
        }
      }
      
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

  const handleSend = async () => {
    await sendPlayerText(input);
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
      content: buildContextualIntro(),
      timestamp: Date.now()
    };
    setMessages([intro]);
    setSimulationWarnings([]);

    // Reset simulation state for new adventure
    if (simulationManagerRef.current) {
      simulationManagerRef.current.reset();
    }

    if (userId) {
      void import('../services/firestore')
        .then(async m => {
          await m.clearAdventureMessages(userId, character.id);
          await m.saveAdventureMessage(userId, character.id, intro);
          // Also clear simulation state in Firestore
          await m.clearSimulationState(userId, character.id);
        })
        .catch(e => console.warn('Failed to reset adventure messages in Firestore', e));
    }
  };

  const clearChat = () => {
    if (confirm('Clear all messages and simulation state? This will reset NPCs, scenes, and tracked facts.')) {
      setMessages([]);
      setSimulationWarnings([]);

      // Reset simulation state
      if (simulationManagerRef.current) {
        simulationManagerRef.current.reset();
      }

      if (userId && character) {
        void import('../services/firestore')
          .then(async m => {
            await m.clearAdventureMessages(userId, character.id);
            await m.clearSimulationState(userId, character.id);
          })
          .catch(e => console.warn('Failed to clear adventure messages in Firestore', e));
      }
    }
  };

  const applyUpdates = (updates: GameStateUpdate) => {
    const toApply: GameStateUpdate = {};
    if (updates.newItems?.length) toApply.newItems = updates.newItems;
    if (updates.removedItems?.length) toApply.removedItems = updates.removedItems;
    if (updates.newQuests?.length) toApply.newQuests = updates.newQuests;
    if (updates.updateQuests?.length) toApply.updateQuests = updates.updateQuests;
    if (typeof updates.goldChange === 'number' && updates.goldChange !== 0) toApply.goldChange = updates.goldChange;
    if (updates.statUpdates && Object.keys(updates.statUpdates).length) toApply.statUpdates = updates.statUpdates;
    if (typeof updates.timeAdvanceMinutes === 'number' && updates.timeAdvanceMinutes !== 0) toApply.timeAdvanceMinutes = updates.timeAdvanceMinutes;
    if (updates.needsChange && Object.keys(updates.needsChange).length) toApply.needsChange = updates.needsChange;
    
    if (Object.keys(toApply).length > 0) {
      onUpdateState(toApply);
    }
  };

  // Get simulation state summary for display
  const getSimulationSummary = () => {
    if (!simulationManagerRef.current) return null;
    const state = simulationManagerRef.current.getState();
    const presentNPCs = (Object.values(state.npcs) as NPC[]).filter(npc => npc.isPresent);
    const allFacts = simulationManagerRef.current.getAllFacts();
    const scene = state.currentScene;
    
    return {
      npcCount: presentNPCs.length,
      npcs: presentNPCs.map(npc => ({
        name: npc.name,
        role: npc.role,
        disposition: npc.disposition,
        tension: npc.tension
      })),
      factCount: Object.keys(allFacts).length,
      facts: allFacts as Record<string, PlayerFact>,
      scene: scene ? {
        type: scene.type,
        location: scene.location,
        phase: scene.phase,
        attempts: scene.attempts,
        resolvedTopics: scene.resolvedTopics
      } : null,
      pendingConsequences: state.pendingConsequences.filter(c => !c.applied).length
    };
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

      {/* AI Model Tip */}
      {showModelTip && (
        <div className="mb-4 bg-blue-900/20 border border-blue-600/50 rounded-lg p-3 sm:p-4 relative">
          <button
            onClick={dismissModelTip}
            className="absolute top-2 right-2 text-blue-200/70 hover:text-blue-200 transition-colors"
            aria-label="Dismiss tip"
            type="button"
          >
            <X size={16} />
          </button>
          <div className="flex items-start gap-2 pr-6">
            <span className="text-blue-400 text-lg">💡</span>
            <div className="flex-1">
              <p className="text-blue-200 text-sm">
                <strong>Tip:</strong> For the best adventure experience, we highly recommend using the <strong>Gemma 2 27B</strong> model. You can change it in the Actions menu.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowSimulationPanel(!showSimulationPanel)}
            className="px-3 py-2 text-gray-400 border border-gray-600 rounded hover:text-skyrim-gold hover:border-skyrim-gold transition-colors flex items-center gap-2 text-sm"
          >
            <Users size={14} /> State {showSimulationPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 text-gray-400 border border-gray-600 rounded hover:text-skyrim-gold hover:border-skyrim-gold transition-colors flex items-center gap-2 text-sm"
          >
            <Settings size={14} /> Settings {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Simulation Warnings */}
      {simulationWarnings.length > 0 && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-200 text-sm font-semibold mb-1">Simulation Warnings:</p>
              <ul className="text-yellow-200/80 text-xs space-y-1">
                {simulationWarnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setSimulationWarnings([])}
              className="text-yellow-200/50 hover:text-yellow-200"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Simulation State Panel */}
      {showSimulationPanel && (
        <div className="mb-4 p-4 bg-black/40 border border-skyrim-border rounded animate-in fade-in">
          <h3 className="text-skyrim-gold font-semibold mb-3 flex items-center gap-2">
            <Users size={16} /> Simulation State
          </h3>
          {(() => {
            const summary = getSimulationSummary();
            if (!summary) return <p className="text-gray-500 text-sm">No simulation data available.</p>;
            
            return (
              <div className="space-y-3 text-sm">
                {/* Current Scene */}
                {summary.scene && (
                  <div className="bg-black/30 p-2 rounded">
                    <p className="text-gray-400 text-xs uppercase mb-1">Current Scene</p>
                    <p className="text-gray-200">
                      <span className="text-skyrim-gold">{summary.scene.type}</span> at {summary.scene.location}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Phase: {summary.scene.phase} | Attempts: {summary.scene.attempts}
                    </p>
                    {summary.scene.resolvedTopics.length > 0 && (
                      <p className="text-green-400/80 text-xs mt-1">
                        ✓ Resolved: {summary.scene.resolvedTopics.join(', ')}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Present NPCs */}
                {summary.npcs.length > 0 && (
                  <div className="bg-black/30 p-2 rounded">
                    <p className="text-gray-400 text-xs uppercase mb-1">Present NPCs ({summary.npcCount})</p>
                    <div className="space-y-1">
                      {summary.npcs.map((npc, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-gray-200">
                            <span className="text-skyrim-gold">{npc.name}</span>
                            <span className="text-gray-500 text-xs ml-1">({npc.role})</span>
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            npc.disposition === 'hostile' ? 'bg-red-900/50 text-red-400' :
                            npc.disposition === 'wary' ? 'bg-yellow-900/50 text-yellow-400' :
                            npc.disposition === 'friendly' ? 'bg-green-900/50 text-green-400' :
                            npc.disposition === 'allied' ? 'bg-blue-900/50 text-blue-400' :
                            'bg-gray-700/50 text-gray-400'
                          }`}>
                            {npc.disposition} ({npc.tension}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Established Facts */}
                {summary.factCount > 0 && (
                  <div className="bg-black/30 p-2 rounded">
                    <p className="text-gray-400 text-xs uppercase mb-1">Established Facts ({summary.factCount})</p>
                    <div className="space-y-1">
                      {Object.entries(summary.facts).slice(0, 5).map(([key, fact]) => (
                        <p key={key} className="text-xs text-gray-300">
                          <span className="text-skyrim-gold">{key}:</span> {fact.value}
                          {fact.disclosedTo.length > 0 && (
                            <span className="text-gray-500 ml-1">(known by {fact.disclosedTo.length})</span>
                          )}
                        </p>
                      ))}
                      {summary.factCount > 5 && (
                        <p className="text-gray-500 text-xs">...and {summary.factCount - 5} more</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Pending Consequences */}
                {summary.pendingConsequences > 0 && (
                  <div className="bg-red-900/20 border border-red-900/30 p-2 rounded">
                    <p className="text-red-400 text-xs">
                      ⚠ {summary.pendingConsequences} pending consequence(s)
                    </p>
                  </div>
                )}
                
                {/* Empty state */}
                {summary.npcs.length === 0 && summary.factCount === 0 && !summary.scene && (
                  <p className="text-gray-500 text-sm">No active simulation state. Start an adventure to begin tracking.</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

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
            <p className="text-center mb-4">
              {hasEstablishedState ? 'Continue where you left off...' : 'Your adventure awaits...'}
            </p>
            <button
              onClick={startNewAdventure}
              className="px-4 py-2 bg-skyrim-gold text-skyrim-dark font-bold rounded hover:bg-skyrim-goldHover transition-colors"
            >
              {hasEstablishedState ? 'Continue Adventure' : 'Begin Your Journey'}
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

                  {/* Clickable dialogue choices */}
                  {msg.role === 'gm' && Array.isArray(msg.updates?.choices) && (msg.updates?.choices?.length || 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.updates!.choices!.slice(0, 6).map((c, idx) => (
                        <button
                          key={`${msg.id}:choice:${idx}`}
                          onClick={() => sendPlayerText((c?.playerText || c?.label || '').trim())}
                          disabled={loading}
                          className="px-3 py-2 bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/40 rounded hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors text-sm font-sans disabled:opacity-50"
                          title={c?.playerText || c?.label}
                        >
                          {c?.label || 'Choose'}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Game state changes indicator */}
                  {msg.role === 'gm' && msg.updates && (
                    <>
                      {/* Inline item changes (always show) */}
                      {(msg.updates.removedItems?.length || msg.updates.newItems?.length || 
                        (typeof msg.updates.goldChange === 'number' && msg.updates.goldChange !== 0)) && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-sans">
                          {msg.updates.removedItems?.map((item, idx) => (
                            <span key={`removed-${idx}`} className="text-red-400 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/30">
                              -{item.quantity} {item.name}
                            </span>
                          ))}
                          {msg.updates.newItems?.map((item, idx) => (
                            <span key={`added-${idx}`} className="text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">
                              +{item.quantity} {item.name}
                            </span>
                          ))}
                          {typeof msg.updates.goldChange === 'number' && msg.updates.goldChange !== 0 && (
                            <span className={`px-2 py-0.5 rounded border ${
                              msg.updates.goldChange > 0 
                                ? 'text-yellow-400 bg-yellow-900/20 border-yellow-900/30' 
                                : 'text-orange-400 bg-orange-900/20 border-orange-900/30'
                            }`}>
                              {msg.updates.goldChange > 0 ? '+' : ''}{msg.updates.goldChange} gold
                            </span>
                          )}
                        </div>
                      )}
                      
                      {/* Full update panel (only when not auto-apply) */}
                      {!autoApply && (
                        <div className="mt-2 p-2 bg-black/40 rounded border border-skyrim-border/50 text-xs">
                          {msg.updates.newQuests?.length ? (
                            <div className="text-skyrim-gold">+ {msg.updates.newQuests.length} quest(s) started</div>
                          ) : null}
                          {typeof msg.updates.timeAdvanceMinutes === 'number' && msg.updates.timeAdvanceMinutes !== 0 ? (
                            <div className="text-gray-300">⏳ {msg.updates.timeAdvanceMinutes > 0 ? '+' : ''}{msg.updates.timeAdvanceMinutes} min</div>
                          ) : null}
                          <button
                            onClick={() => applyUpdates(msg.updates!)}
                            className="mt-1 px-2 py-1 bg-skyrim-gold/20 text-skyrim-gold border border-skyrim-gold/50 rounded text-xs hover:bg-skyrim-gold hover:text-skyrim-dark transition-colors"
                          >
                            Apply Changes
                          </button>
                        </div>
                      )}
                    </>
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
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 bg-black/30 border border-skyrim-border rounded p-3 text-gray-200 placeholder-gray-500 resize-none focus:border-skyrim-gold focus:outline-none disabled:opacity-50 font-sans normal-case"
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
