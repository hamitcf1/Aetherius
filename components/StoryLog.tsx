import React, { useState } from 'react';
import { StoryChapter, Character, CustomQuest, JournalEntry, InventoryItem, GameStateUpdate } from '../types';
import { Scroll, Calendar, Image as ImageIcon, Loader2, Plus, Download, Send, BookOpen, X } from 'lucide-react';
import { generateLoreImage, generateGameMasterResponse } from '../services/geminiService';

interface AdventureMessage {
  id: string;
  role: 'player' | 'gm';
  content: string;
  timestamp: number;
}

interface StoryLogProps {
  chapters: StoryChapter[];
  onUpdateChapter: (chapter: StoryChapter) => void;
  onAddChapter?: (chapter: StoryChapter) => void;
    onGameUpdate?: (updates: GameStateUpdate) => void;
  character?: Character;
  quests?: CustomQuest[];
  journal?: JournalEntry[];
  items?: InventoryItem[];
  userId?: string | null;
}

export const StoryLog: React.FC<StoryLogProps> = ({ 
    chapters, 
    onUpdateChapter,
    onAddChapter,
    onGameUpdate,
    character,
    quests = [],
    journal = [],
    items = [],
    userId
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
  
  // Finalize modal state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeProgress, setFinalizeProgress] = useState('');
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [generatedBook, setGeneratedBook] = useState<string[]>([]);

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

  // AI-powered story generation - weaves chapters + adventure chat into a real book
  const handleFinalizeStory = async () => {
    if (!character) return;
    
    setShowFinalizeModal(true);
    setIsExportingStory(true);
    setFinalizeError(null);
    setGeneratedBook([]);
    setFinalizeProgress('Loading adventure history...');

    try {
      // Load adventure messages if we have a userId
      let adventureMessages: AdventureMessage[] = [];
      if (userId && character.id) {
        try {
          const { loadAdventureMessages } = await import('../services/firestore');
          adventureMessages = await loadAdventureMessages(userId, character.id);
        } catch (e) {
          console.warn('Could not load adventure messages:', e);
        }
      }

      setFinalizeProgress('Preparing story materials...');

      // Sort all content chronologically
      const sortedChapters = [...chapters].filter(c => !c.deleted).sort((a, b) => a.createdAt - b.createdAt);
      const sortedJournal = [...journal].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const sortedMessages = adventureMessages.sort((a, b) => a.timestamp - b.timestamp);

      // Build the source material for AI
      const sourceMaterial = {
        character: {
          name: character.name,
          race: character.race,
          gender: character.gender,
          archetype: character.archetype,
          level: character.level,
          identity: character.identity,
          psychology: character.psychology,
          moralCode: character.moralCode
        },
        chapters: sortedChapters.map(c => ({ title: c.title, content: c.content, date: c.date })),
        journal: sortedJournal.slice(-20).map(j => ({ title: j.title, content: j.content, date: j.date })),
        adventures: sortedMessages.slice(-100).map(m => ({ role: m.role, content: m.content.substring(0, 500) })),
        quests: quests.map(q => ({ title: q.title, status: q.status, description: q.description }))
      };

      // If no content, show error
      if (sortedChapters.length === 0 && sortedMessages.length === 0 && sortedJournal.length === 0) {
        throw new Error('No story content found. Create some chapters or play some adventures first!');
      }

      setFinalizeProgress('AI is crafting your story... (this may take a minute)');

      // Generate the book using AI
      const bookPrompt = `You are a master storyteller tasked with writing a complete narrative book based on a character's adventures in Skyrim.

CHARACTER:
Name: ${sourceMaterial.character.name}
Race: ${sourceMaterial.character.race} ${sourceMaterial.character.gender}
Class: ${sourceMaterial.character.archetype}
Level: ${sourceMaterial.character.level}
Identity: ${sourceMaterial.character.identity || 'Unknown'}
Psychology: ${sourceMaterial.character.psychology || 'Unknown'}
Moral Code: ${sourceMaterial.character.moralCode || 'Unknown'}

SOURCE MATERIALS (use these as the basis for the story):
${sortedChapters.length > 0 ? `\n=== STORY CHAPTERS ===\n${sortedChapters.map(c => `[${c.title}]\n${c.content}`).join('\n\n')}` : ''}
${sortedJournal.length > 0 ? `\n=== JOURNAL ENTRIES ===\n${sortedJournal.slice(-15).map(j => `[${j.title}]\n${j.content}`).join('\n\n')}` : ''}
${sortedMessages.length > 0 ? `\n=== ADVENTURE CONVERSATIONS ===\n${sortedMessages.slice(-50).map(m => `${m.role === 'player' ? 'HERO' : 'NARRATOR'}: ${m.content.substring(0, 300)}`).join('\n')}` : ''}
${quests.length > 0 ? `\n=== QUESTS ===\n${quests.map(q => `- ${q.title} (${q.status}): ${q.description || ''}`).join('\n')}` : ''}

TASK:
Write a compelling narrative book (like a novel) about ${sourceMaterial.character.name}'s journey. 

RULES:
1. Write in third-person narrative prose, like a fantasy novel
2. Transform the raw events into flowing, dramatic storytelling
3. Include vivid descriptions, dialogue, and emotional depth
4. Organize into clear chapters with titles
5. Each chapter should be 2-4 paragraphs
6. Maintain the character's personality and decisions
7. Use proper Skyrim lore and terminology
8. Make it feel like an Elder Scrolls book you'd find in-game

FORMAT YOUR RESPONSE AS:
===CHAPTER: [Title]===
[Chapter content here...]

===CHAPTER: [Title]===
[Chapter content here...]

(Continue with all chapters)

Write the complete book now:`;

      const response = await generateGameMasterResponse(bookPrompt, JSON.stringify(sourceMaterial));
      
      if (!response.narrative?.content) {
        throw new Error('AI did not generate story content. Please try again.');
      }

      // Parse the generated book into chapters
      const bookContent = response.narrative.content;
      const chapterRegex = /===CHAPTER:\s*(.+?)===\s*([\s\S]*?)(?====CHAPTER:|$)/gi;
      const generatedChapters: { title: string; content: string }[] = [];
      
      let match;
      while ((match = chapterRegex.exec(bookContent)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        if (title && content) {
          generatedChapters.push({ title, content });
        }
      }

      // If regex didn't work, just use the whole content as one chapter
      if (generatedChapters.length === 0) {
        generatedChapters.push({
          title: `The Tale of ${character.name}`,
          content: bookContent
        });
      }

      setGeneratedBook(generatedChapters.map(c => `## ${c.title}\n\n${c.content}`));
      setFinalizeProgress('Generating PDF...');

      // Generate PDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      // Theme colors
      const COLOR_BG = [15, 12, 8];
      const COLOR_TEXT = [230, 220, 200];
      const COLOR_GOLD = [192, 160, 98];
      const COLOR_CHAPTER = [160, 140, 100];

      const drawBackground = () => {
        doc.setFillColor(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2]);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        // Decorative border
        doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
        doc.setLineWidth(1);
        doc.rect(margin/2, margin/2, pageWidth - margin, pageHeight - margin, 'S');
        // Inner border
        doc.setLineWidth(0.3);
        doc.rect(margin/2 + 3, margin/2 + 3, pageWidth - margin - 6, pageHeight - margin - 6, 'S');
      };

      const checkPageBreak = (heightNeeded: number) => {
        if (yPos + heightNeeded > pageHeight - margin) {
          doc.addPage();
          drawBackground();
          yPos = margin + 15;
        }
      };

      // Title Page
      drawBackground();
      
      yPos = pageHeight / 3;
      doc.setFont('times', 'bold');
      doc.setFontSize(32);
      doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.text('The Chronicle', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.setTextColor(COLOR_CHAPTER[0], COLOR_CHAPTER[1], COLOR_CHAPTER[2]);
      doc.text('~ of ~', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(24);
      doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.text(character.name, pageWidth / 2, yPos, { align: 'center' });

      yPos += 20;
      doc.setFontSize(11);
      doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
      doc.text(`A ${character.gender} ${character.race} ${character.archetype}`, pageWidth / 2, yPos, { align: 'center' });

      yPos += 8;
      doc.setFontSize(10);
      doc.setTextColor(COLOR_CHAPTER[0], COLOR_CHAPTER[1], COLOR_CHAPTER[2]);
      doc.text(`Level ${character.level}`, pageWidth / 2, yPos, { align: 'center' });

      // Add character identity if present
      if (character.identity) {
        yPos += 25;
        doc.setFontSize(9);
        doc.setTextColor(COLOR_TEXT[0] - 40, COLOR_TEXT[1] - 40, COLOR_TEXT[2] - 40);
        const identityLines = doc.splitTextToSize(`"${character.identity}"`, contentWidth - 20);
        doc.text(identityLines, pageWidth / 2, yPos, { align: 'center' });
      }

      // Book chapters
      generatedChapters.forEach((chapter, index) => {
        doc.addPage();
        drawBackground();
        yPos = margin + 10;

        // Chapter number
        doc.setFont('times', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(COLOR_CHAPTER[0], COLOR_CHAPTER[1], COLOR_CHAPTER[2]);
        doc.text(`Chapter ${index + 1}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Chapter title
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
        const titleLines = doc.splitTextToSize(chapter.title, contentWidth);
        doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
        yPos += titleLines.length * 8 + 15;

        // Decorative divider
        doc.setDrawColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
        doc.setLineWidth(0.5);
        doc.line(pageWidth / 2 - 30, yPos - 5, pageWidth / 2 + 30, yPos - 5);
        yPos += 10;

        // Chapter content
        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(COLOR_TEXT[0], COLOR_TEXT[1], COLOR_TEXT[2]);
        
        const paragraphs = chapter.content.split('\n\n');
        paragraphs.forEach(para => {
          const trimmed = para.trim();
          if (!trimmed) return;
          
          const lines = doc.splitTextToSize(trimmed, contentWidth);
          const contentHeight = lines.length * 5.5;
          
          checkPageBreak(contentHeight + 10);
          doc.text(lines, margin, yPos);
          yPos += contentHeight + 8;
        });
      });

      // Final page - The End
      doc.addPage();
      drawBackground();
      yPos = pageHeight / 2 - 20;
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.text('~ The End ~', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 20;
      doc.setFontSize(10);
      doc.setTextColor(COLOR_CHAPTER[0], COLOR_CHAPTER[1], COLOR_CHAPTER[2]);
      doc.text('...or perhaps, just another chapter yet unwritten.', pageWidth / 2, yPos, { align: 'center' });

      doc.save(`${character.name}_Chronicle.pdf`);
      setFinalizeProgress('Complete! Your book has been downloaded.');

    } catch (error: any) {
      console.error('Error finalizing story:', error);
      setFinalizeError(error.message || 'Failed to generate story. Please try again.');
    } finally {
      setIsExportingStory(false);
    }
  };

  // Quick export (old method - just lists chapters)
  const handleQuickExport = async () => {
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

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-skyrim-paper border-2 border-skyrim-gold rounded-lg shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif text-skyrim-gold flex items-center gap-2">
                <BookOpen size={24} /> Finalizing Your Chronicle
              </h3>
              {!isExportingStory && (
                <button 
                  onClick={() => setShowFinalizeModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {isExportingStory && (
              <div className="flex items-center gap-3 text-gray-300 mb-4">
                <Loader2 className="animate-spin text-skyrim-gold" size={20} />
                <span>{finalizeProgress}</span>
              </div>
            )}

            {finalizeError && (
              <div className="bg-red-900/30 border border-red-700 rounded p-4 mb-4 text-red-200">
                {finalizeError}
              </div>
            )}

            {generatedBook.length > 0 && (
              <div className="bg-black/40 border border-skyrim-border rounded p-4 mb-4 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-400 mb-2">Preview (first chapter):</p>
                <div className="text-gray-300 text-sm whitespace-pre-wrap font-serif">
                  {generatedBook[0]?.substring(0, 500)}...
                </div>
              </div>
            )}

            {!isExportingStory && !finalizeError && generatedBook.length > 0 && (
              <p className="text-green-400 mb-4">✓ Your chronicle has been downloaded!</p>
            )}

            <div className="flex gap-2">
              {!isExportingStory && (
                <button
                  onClick={() => setShowFinalizeModal(false)}
                  className="flex-1 py-2 bg-gray-600 text-white font-bold rounded hover:bg-gray-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chapter Creation Section */}
      {!creatingChapter ? (
          <div className="mb-8 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                    onClick={() => setCreatingChapter(true)}
                    className="flex-1 py-3 bg-skyrim-accent hover:bg-skyrim-accent/80 text-white font-bold rounded flex items-center justify-center gap-2 border border-skyrim-border transition-colors"
                >
                    <Plus size={20} /> Create Chapter
                </button>
                <button 
                    onClick={handleFinalizeStory}
                    disabled={isExportingStory}
                    className="flex-1 py-3 bg-skyrim-gold hover:bg-yellow-400 text-skyrim-dark font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                    <BookOpen size={20} /> {isExportingStory ? 'Creating Book...' : 'Finalize as Book'}
                </button>
              </div>
              <button 
                  onClick={handleQuickExport}
                  disabled={isExportingStory || sortedChapters.length === 0}
                  className="py-2 bg-skyrim-dark hover:bg-black text-gray-400 text-sm font-bold rounded flex items-center justify-center gap-2 border border-skyrim-border disabled:opacity-50 transition-colors"
              >
                  <Download size={16} /> Quick Export (chapters only)
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
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full bg-black/50 border border-skyrim-border rounded p-3 text-gray-300 focus:border-skyrim-gold focus:outline-none"
                  />
              </div>

              <div className="mb-4">
                  <label className="text-sm uppercase tracking-wider text-gray-400 font-bold block mb-2">Content</label>
                  <textarea 
                      value={chapterContent}
                      onChange={e => setChapterContent(e.target.value)}
                      placeholder="Write your chapter or use AI..."
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full bg-black/50 border border-skyrim-border rounded p-3 text-gray-300 focus:border-skyrim-gold focus:outline-none resize-none h-32 font-sans"
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
                          autoCapitalize="none"
                          autoCorrect="off"
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
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none"
                      />
                      <input
                          type="text"
                          value={questLocation}
                          onChange={e => setQuestLocation(e.target.value)}
                          placeholder="Location (optional)..."
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none"
                      />
                      <textarea
                          value={questDescription}
                          onChange={e => setQuestDescription(e.target.value)}
                          placeholder="Quest description..."
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none resize-none h-20 font-sans"
                      />
                      <textarea
                          value={questObjectivesText}
                          onChange={e => setQuestObjectivesText(e.target.value)}
                          placeholder="Objectives (one per line)..."
                          autoCapitalize="none"
                          autoCorrect="off"
                          className="w-full bg-black/50 border border-skyrim-border rounded p-2 text-gray-300 text-sm focus:border-skyrim-gold focus:outline-none resize-none h-20 font-sans"
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