import React, { useState } from 'react';
import { StoryChapter, Character, CustomQuest, JournalEntry, InventoryItem, GameStateUpdate } from '../types';
import { Scroll, Calendar, Image as ImageIcon, Loader2, Plus, Download, Send } from 'lucide-react';
import { generateLoreImage, generateGameMasterResponse } from '../services/geminiService';

interface StoryLogProps {
  chapters: StoryChapter[];
  onUpdateChapter: (chapter: StoryChapter) => void;
  onAddChapter?: (chapter: StoryChapter) => void;
    onGameUpdate?: (updates: GameStateUpdate) => void;
  character?: Character;
  quests?: CustomQuest[];
  journal?: JournalEntry[];
  items?: InventoryItem[];
}

export const StoryLog: React.FC<StoryLogProps> = ({ 
    chapters, 
    onUpdateChapter,
    onAddChapter,
    onGameUpdate,
    character,
    quests = [],
    journal = [],
    items = []
}) => {
    // Filter out deleted chapters
    const visibleChapters = chapters.filter(c => !c.deleted);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [creatingChapter, setCreatingChapter] = useState(false);
    const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [chapterPrompt, setChapterPrompt] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [isExportingStory, setIsExportingStory] = useState(false);

    const [questTitle, setQuestTitle] = useState('');
    const [questLocation, setQuestLocation] = useState('');
    const [questDescription, setQuestDescription] = useState('');
    const [questObjectivesText, setQuestObjectivesText] = useState('');

  const handleVisualize = async (chapter: StoryChapter) => {
      setLoadingId(chapter.id);
      try {
          const img = await generateLoreImage(`Skyrim lore scene: ${chapter.title}. ${chapter.content.substring(0, 200)}`);
          if (img) {
              onUpdateChapter({ ...chapter, imageUrl: img });
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingId(null);
      }
  };

  const handleCreateChapter = async () => {
      if (chapterTitle.trim() && chapterContent.trim()) {
          const newChapter: StoryChapter = {
              id: Math.random().toString(36).substr(2, 9),
              characterId: character?.id || '',
              title: chapterTitle,
              content: chapterContent,
              date: "4E 201",
              summary: chapterTitle,
              createdAt: Date.now()
          };
          onAddChapter?.(newChapter);
          setChapterTitle('');
          setChapterContent('');
          setCreatingChapter(false);
      }
  };

  const handleGenerateChapterWithAI = async () => {
      if (!chapterPrompt.trim() || !character) return;

      setIsGeneratingChapter(true);
      try {
          const context = JSON.stringify({
              character,
              quests: quests.filter(q => q.status === 'active'),
              recentStory: chapters.slice(-2),
              inventory: items.slice(0, 5)
          });

          const update = await generateGameMasterResponse(chapterPrompt, context);

          if (typeof onGameUpdate === 'function') {
              onGameUpdate(update);
              setChapterPrompt('');
              return;
          }

          if (update.narrative) {
            const newChapter: StoryChapter = {
                id: Math.random().toString(36).substr(2, 9),
                characterId: character.id,
                title: update.narrative.title,
                content: update.narrative.content,
                date: "4E 201",
                summary: update.narrative.title,
                createdAt: Date.now()
            };
            onAddChapter?.(newChapter);
            setChapterPrompt('');
          }
      } catch (error) {
          console.error('Error generating chapter:', error);
      } finally {
          setIsGeneratingChapter(false);
      }
  };

  const handleAddQuestFromStory = () => {
      if (!questTitle.trim()) return;
      if (typeof onGameUpdate !== 'function') return;

      const objectives = (questObjectivesText || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(description => ({ description, completed: false }));

      onGameUpdate({
        newQuests: [
          {
            title: questTitle.trim(),
            description: questDescription.trim(),
            location: questLocation.trim() || undefined,
            objectives: objectives.length ? objectives : undefined,
          },
        ],
      });

      setQuestTitle('');
      setQuestLocation('');
      setQuestDescription('');
      setQuestObjectivesText('');
  };

  const handleExportStory = async () => {
      setIsExportingStory(true);
      try {
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const margin = 20;
          const contentWidth = pageWidth - (margin * 2);
          let yPos = margin;

          // Theme
          const COLOR_BG = [20, 20, 20];
          const COLOR_TEXT = [220, 220, 220];
          const COLOR_GOLD = [192, 160, 98];

          const drawBackground = () => {
              doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
              doc.rect(0, 0, pageWidth, pageHeight, 'F');
              doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
              doc.setLineWidth(0.5);
              doc.rect(margin/2, margin/2, pageWidth - margin, pageHeight - margin, 'S');
          };

          const checkPageBreak = (heightNeeded: number) => {
              if (yPos + heightNeeded > pageHeight - margin) {
                  doc.addPage();
                  drawBackground();
                  yPos = margin + 10;
              }
          };

          // Title Page
          drawBackground();
          
          doc.setFont('times', 'bold');
          doc.setFontSize(28);
          doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
          doc.text('The Chronicle', pageWidth / 2, yPos + 20, { align: 'center' });
          yPos += 40;

          if (character) {
              doc.setFontSize(16);
              doc.text(`${character.name}'s Journey`, pageWidth / 2, yPos, { align: 'center' });
              yPos += 15;
              
              doc.setFontSize(11);
              doc.setTextColor(180, 180, 180);
              doc.text(`Level ${character.level} ${character.gender} ${character.race} ${character.archetype}`, pageWidth / 2, yPos, { align: 'center' });
          }

          // Chapters
          const sortedChapters = [...chapters].sort((a, b) => a.createdAt - b.createdAt);
          
          sortedChapters.forEach((chapter, index) => {
              checkPageBreak(30);
              
              doc.setFont('times', 'bold');
              doc.setFontSize(14);
              doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
              doc.text(`Chapter ${index + 1}: ${chapter.title}`, margin, yPos);
              yPos += 10;

              doc.setFontSize(9);
              doc.setTextColor(160, 160, 160);
              doc.text(`${chapter.date}`, margin, yPos);
              yPos += 8;

              // Content
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(10);
              doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
              const lines = doc.splitTextToSize(chapter.content, contentWidth);
              const contentHeight = lines.length * 4.5;
              
              checkPageBreak(contentHeight + 5);
              doc.text(lines, margin, yPos);
              yPos += contentHeight + 15;
          });

          doc.save(`${character?.name || 'Story'}_Chronicle.pdf`);
      } catch (error) {
          console.error('Error exporting story:', error);
      } finally {
          setIsExportingStory(false);
      }
  };

  const sortedChapters = [...chapters].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-4xl mx-auto pb-24 px-2 sm:px-4">
    <div className="mb-8 p-4 sm:p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2">The Chronicle</h1>
        <p className="text-gray-500 font-sans text-sm">The unfolding saga of your journey.</p>
      </div>

      {/* Chapter Creation Section */}
      {!creatingChapter ? (
          <div className="mb-8 flex flex-col sm:flex-row gap-3">
              <button 
                  onClick={() => setCreatingChapter(true)}
                  className="flex-1 py-3 bg-skyrim-accent hover:bg-skyrim-accent/80 text-white font-bold rounded flex items-center justify-center gap-2 border border-skyrim-border transition-colors"
              >
                  <Plus size={20} /> Create Chapter
              </button>
              <button 
                  onClick={handleExportStory}
                  disabled={isExportingStory || sortedChapters.length === 0}
                  className="flex-1 py-3 bg-skyrim-dark hover:bg-black text-skyrim-gold font-bold rounded flex items-center justify-center gap-2 border border-skyrim-gold disabled:opacity-50 transition-colors"
              >
                  <Download size={20} /> {isExportingStory ? 'Finalizing...' : 'Finalize & Download'}
              </button>
          </div>
      ) : (
          <div className="mb-8 p-4 sm:p-6 bg-black/40 border border-skyrim-border rounded-lg">
              <h3 className="text-xl font-serif text-skyrim-gold mb-4">New Chapter</h3>
              
              <div className="mb-4">
                  <label className="text-sm uppercase tracking-wider text-gray-400 font-bold block mb-2">Title</label>
                  <input 
                      type="text"
                      value={chapterTitle}
                      onChange={e => setChapterTitle(e.target.value)}
                      placeholder="Chapter title..."
                      className="w-full bg-black/50 border border-skyrim-border rounded p-3 text-gray-300 focus:border-skyrim-gold focus:outline-none"
                  />
              </div>

              <div className="mb-4">
                  <label className="text-sm uppercase tracking-wider text-gray-400 font-bold block mb-2">Content</label>
                  <textarea 
                      value={chapterContent}
                      onChange={e => setChapterContent(e.target.value)}
                      placeholder="Write your chapter or use AI..."
                      className="w-full bg-black/50 border border-skyrim-border rounded p-3 text-gray-300 focus:border-skyrim-gold focus:outline-none resize-none h-32 font-serif"
                  />
              </div>

              <div className="mb-4 p-2 sm:p-4 bg-black/30 border border-gray-700 rounded">
                  <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">Or Generate with AI</p>
                  <div className="flex gap-2">
                      <input 
                          type="text"
                          value={chapterPrompt}
                          onChange={e => setChapterPrompt(e.target.value)}
                          placeholder="Describe what should happen in this chapter..."
                          className="flex-1 bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none"
                      />
                      <button 
                          onClick={handleGenerateChapterWithAI}
                          disabled={!chapterPrompt.trim() || isGeneratingChapter}
                          className="px-4 py-2 bg-skyrim-accent hover:bg-skyrim-accent/80 text-white rounded text-sm font-bold disabled:opacity-50 flex items-center gap-1"
                      >
                          {isGeneratingChapter ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      </button>
                  </div>
              </div>

              <div className="mb-4 p-2 sm:p-4 bg-black/30 border border-gray-700 rounded">
                  <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-bold">Add Quest (Optional)</p>
                  <div className="grid gap-3">
                      <input
                          type="text"
                          value={questTitle}
                          onChange={e => setQuestTitle(e.target.value)}
                          placeholder="Quest title..."
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none"
                      />
                      <input
                          type="text"
                          value={questLocation}
                          onChange={e => setQuestLocation(e.target.value)}
                          placeholder="Location (optional)..."
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none"
                      />
                      <textarea
                          value={questDescription}
                          onChange={e => setQuestDescription(e.target.value)}
                          placeholder="Quest description..."
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none resize-none h-20 font-serif"
                      />
                      <textarea
                          value={questObjectivesText}
                          onChange={e => setQuestObjectivesText(e.target.value)}
                          placeholder="Objectives (one per line)..."
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none resize-none h-20 font-serif"
                      />
                      <button
                          onClick={handleAddQuestFromStory}
                          disabled={!questTitle.trim() || typeof onGameUpdate !== 'function'}
                          className="px-4 py-2 bg-skyrim-gold/90 hover:bg-skyrim-gold text-skyrim-dark rounded text-sm font-bold disabled:opacity-50"
                      >
                          Add Quest
                      </button>
                      {typeof onGameUpdate !== 'function' && (
                        <div className="text-[11px] text-gray-500">Quest creation requires game update wiring.</div>
                      )}
                  </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                      onClick={handleCreateChapter}
                      disabled={!chapterTitle.trim() || !chapterContent.trim()}
                      className="flex-1 py-2 bg-skyrim-gold text-skyrim-dark font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
                  >
                      Save Chapter
                  </button>
                  <button 
                      onClick={() => {
                          setCreatingChapter(false);
                          setChapterTitle('');
                          setChapterContent('');
                          setChapterPrompt('');
                      }}
                      className="flex-1 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

            <div className="space-y-12">
                {visibleChapters.map((chapter) => (
          <div key={chapter.id} className="relative pl-8 md:pl-0">
             {/* Timeline Line */}
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-skyrim-border/30 md:left-1/2 md:-ml-0.5"></div>
             
             <div className="relative bg-skyrim-paper border border-skyrim-border p-8 rounded shadow-2xl max-w-3xl mx-auto">
                 {/* Decorative Header */}
                 <div className="flex justify-between items-center mb-6 border-b border-skyrim-border pb-4">
                     <div>
                         <h2 className="text-2xl font-serif text-skyrim-gold">{chapter.title}</h2>
                         <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 uppercase tracking-widest">
                             <Calendar size={12} />
                             <span>{chapter.date}</span>
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                       <Scroll className="text-skyrim-gold/20" size={40} />
                       <button onClick={() => {
                         if (window.confirm('Delete this entry?')) {
                           const updated = sortedChapters.filter(c => c.id !== chapter.id);
                           onUpdateChapter && onUpdateChapter({ ...chapter, deleted: true });
                           // Remove from parent state if possible
                           if (typeof window !== 'undefined') {
                             // Forcibly update parent if possible
                             if (typeof window.setStoryChapters === 'function') {
                               window.setStoryChapters(updated);
                             }
                           }
                         }
                       }} className="ml-2 text-red-500 hover:text-white text-xs border border-red-500 rounded px-2 py-1">Delete</button>
                     </div>
                 </div>
                 
                 {chapter.imageUrl ? (
                     <div className="mb-6 rounded overflow-hidden border border-skyrim-border shadow-inner">
                         <img src={chapter.imageUrl} alt={chapter.title} className="w-full object-cover max-h-80" />
                     </div>
                 ) : (
                     <div className="mb-6 flex justify-end">
                         <button 
                            onClick={() => handleVisualize(chapter)}
                            disabled={loadingId === chapter.id}
                            className="text-xs flex items-center gap-1 text-skyrim-gold hover:text-white disabled:opacity-50"
                         >
                            {loadingId === chapter.id ? <Loader2 className="animate-spin" size={12}/> : <ImageIcon size={12}/>}
                            Visualize Memory
                         </button>
                     </div>
                 )}

                 <div className="prose prose-invert prose-p:font-serif prose-p:text-gray-300 prose-p:leading-relaxed max-w-none">
                     <p className="whitespace-pre-wrap">{chapter.content}</p>
                 </div>
             </div>
             
             {/* Timeline Dot */}
             <div className="absolute left-[-5px] top-10 w-3 h-3 bg-skyrim-gold rounded-full border border-skyrim-dark md:left-1/2 md:-ml-[7px] z-10 shadow-[0_0_10px_rgba(192,160,98,0.5)]"></div>
          </div>
        ))}

        {sortedChapters.length === 0 && (
            <div className="text-center py-20 text-gray-500 italic font-serif">
                The pages are blank. Begin your tale or consult the Scribe.
            </div>
        )}
      </div>
    </div>
  );
};