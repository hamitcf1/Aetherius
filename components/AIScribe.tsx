import React, { useState } from 'react';
import { generateGameMasterResponse, generateLoreImage } from '../services/geminiService';
import { GameStateUpdate } from '../types';
import { Sparkles, X, Scroll, Loader2, Play, Image as ImageIcon } from 'lucide-react';

interface AIScribeProps {
  contextData: string;
  onUpdateState: (updates: GameStateUpdate) => void;
}

export const AIScribe: React.FC<AIScribeProps> = ({ contextData, onUpdateState }) => {
  const [batchInput, setBatchInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<GameStateUpdate | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const parseBatchInput = (text: string): GameStateUpdate | null => {
    const raw = (text || '').trim();
    if (!raw) return null;

    const parts = raw
      .split(/\n|,|\band\b/gi)
      .map(s => s.trim())
      .filter(Boolean);

    const newItems: NonNullable<GameStateUpdate['newItems']> = [];
    let goldChange = 0;

    for (const part of parts) {
      const goldMatch = part.match(/(\d+)\s*(?:x\s*)?(?:gold|septim|septims)\b/i);
      if (goldMatch) {
        goldChange += parseInt(goldMatch[1], 10) || 0;
        continue;
      }

      // Match: "6x iron mace" or "6 iron mace"
      const qtyMatch = part.match(/^(\d+)\s*x?\s+(.+)$/i);
      if (qtyMatch) {
        const quantity = Math.max(1, parseInt(qtyMatch[1], 10) || 1);
        const name = qtyMatch[2].trim();
        if (name) {
          newItems.push({ name, type: 'misc', description: '', quantity });
        }
        continue;
      }

      // Fallback: treat as 1x item name
      if (part) {
        newItems.push({ name: part, type: 'misc', description: '', quantity: 1 });
      }
    }

    const updates: GameStateUpdate = {};
    if (newItems.length > 0) updates.newItems = newItems;
    if (goldChange !== 0) updates.goldChange = goldChange;

    return Object.keys(updates).length ? updates : null;
  };

  const mergeUpdates = (base: GameStateUpdate, extra: GameStateUpdate | null): GameStateUpdate => {
    if (!extra) return base;
    return {
      ...base,
      newItems: [...(base.newItems || []), ...(extra.newItems || [])],
      newQuests: [...(base.newQuests || []), ...(extra.newQuests || [])],
      updateQuests: [...(base.updateQuests || []), ...(extra.updateQuests || [])],
      removedItems: [...(base.removedItems || []), ...(extra.removedItems || [])],
      statUpdates: { ...(base.statUpdates || {}), ...(extra.statUpdates || {}) },
      goldChange: (base.goldChange || 0) + (extra.goldChange || 0),
      xpChange: (base.xpChange || 0) + (extra.xpChange || 0),
      narrative: base.narrative || extra.narrative,
    };
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setLastResponse(null);
    setGeneratedImage(null);
    try {
      const updates = await generateGameMasterResponse(prompt, contextData);
      setLastResponse(updates);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVisualize = async () => {
      if (!lastResponse?.narrative?.content) return;
      setImageLoading(true);
      try {
          const img = await generateLoreImage(`Skyrim fantasy art style, dramatic lighting, concept art, atmospheric, highly detailed: ${lastResponse.narrative.content.substring(0, 300)}`);
          setGeneratedImage(img);
      } catch(e) {
          console.error(e);
      } finally {
          setImageLoading(false);
      }
  };

  const handleApply = () => {
      if (lastResponse) {
          const batchUpdates = parseBatchInput(batchInput);
          const merged = mergeUpdates(lastResponse, batchUpdates);
          onUpdateState(merged);
          setIsOpen(false);
          setPrompt('');
          setBatchInput('');
          setLastResponse(null);
          setGeneratedImage(null);
      }
  };

  const handleApplyBatchOnly = () => {
    const updates = parseBatchInput(batchInput);
    if (!updates) return;
    onUpdateState(updates);
    setIsOpen(false);
    setPrompt('');
    setBatchInput('');
    setLastResponse(null);
    setGeneratedImage(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-skyrim-gold hover:bg-skyrim-goldHover text-skyrim-dark rounded-full shadow-lg border-2 border-skyrim-dark transition-transform hover:scale-105 z-50 flex items-center gap-2 font-serif font-bold"
        title="Consult the Game Master"
      >
        <Sparkles size={20} />
        <span className="hidden md:inline">Consult Game Master</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-skyrim-paper border border-skyrim-gold w-full max-w-lg rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-skyrim-border flex justify-between items-center bg-skyrim-dark/50 rounded-t-lg">
          <h3 className="text-skyrim-gold font-serif text-xl flex items-center gap-2">
            <Scroll size={20} />
            The Game Master
          </h3>
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-gray-400 italic">
            "Describe your action. I will determine the outcome."
          </p>
          
          <div>
            <label className="block text-skyrim-gold text-sm font-bold mb-2">
              Your Action
            </label>
            <textarea
              className="w-full bg-black/30 border border-skyrim-border text-gray-200 p-3 rounded focus:border-skyrim-gold focus:outline-none mb-2"
              rows={3}
              placeholder="e.g., I search the bandit chest for loot..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <textarea
              className="w-full bg-black/20 border border-skyrim-border text-gray-300 p-2 rounded focus:border-skyrim-gold focus:outline-none text-xs font-mono"
              rows={2}
              placeholder="Batch add: 1x Iron Sword, 2x Potion of Healing, Quest: The Golden Claw, ..."
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
            />
          </div>

          {lastResponse && (
            <div className="bg-black/20 p-4 rounded border border-skyrim-border/50 animate-in fade-in">
              <h4 className="text-xs uppercase tracking-widest text-skyrim-gold mb-2">Outcome</h4>
              <h5 className="font-serif text-lg text-white mb-1">{lastResponse.narrative?.title}</h5>
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed font-serif mb-4">
                {lastResponse.narrative?.content}
              </p>
              
              {generatedImage && (
                  <div className="mb-4 relative group">
                      <img src={generatedImage} alt="Generated Scene" className="w-full rounded border border-skyrim-border" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                         <span className="text-white text-xs">Generated by Gemini</span>
                      </div>
                  </div>
              )}

              {!generatedImage && (
                  <button 
                    onClick={handleVisualize} 
                    disabled={imageLoading}
                    className="mb-4 text-xs flex items-center gap-1 text-skyrim-gold hover:text-white disabled:opacity-50"
                  >
                      {imageLoading ? <Loader2 className="animate-spin" size={12}/> : <ImageIcon size={12}/>}
                      Visualize Scene
                  </button>
              )}
              
              {(lastResponse.newItems?.length || 0) > 0 && (
                  <div className="text-xs text-green-400 mb-1">+ Items found: {lastResponse.newItems?.length}</div>
              )}
               {(lastResponse.newQuests?.length || 0) > 0 && (
                  <div className="text-xs text-skyrim-gold mb-1">+ Quests started: {lastResponse.newQuests?.length}</div>
              )}
               {(lastResponse.updateQuests?.length || 0) > 0 && (
                  <div className="text-xs text-blue-400 mb-1">~ Quests updated: {lastResponse.updateQuests?.length}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-skyrim-border bg-skyrim-dark/30 rounded-b-lg flex justify-end gap-3">
           {lastResponse ? (
             <>
               <button
                  onClick={() => { setLastResponse(null); setGeneratedImage(null); }}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Discard
                </button>
               <button
                 onClick={handleApply}
                 className="px-4 py-2 bg-skyrim-gold hover:bg-skyrim-goldHover text-skyrim-dark font-bold rounded font-serif flex items-center gap-2"
               >
                 <Play size={16} /> Apply Changes
               </button>
             </>
           ) : (
            <>
              <button
                onClick={handleApplyBatchOnly}
                disabled={loading || !batchInput.trim()}
                className="px-4 py-2 border border-skyrim-gold text-skyrim-gold hover:bg-skyrim-gold hover:text-skyrim-dark disabled:opacity-50 disabled:cursor-not-allowed font-bold rounded flex items-center gap-2 font-serif text-sm"
              >
                <Play size={16} /> Apply Batch
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className="px-6 py-2 bg-skyrim-gold hover:bg-skyrim-goldHover disabled:opacity-50 disabled:cursor-not-allowed text-skyrim-dark font-bold rounded flex items-center gap-2 font-serif"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Generate Outcome
              </button>
            </>
           )}
        </div>
      </div>
    </div>
  );
};