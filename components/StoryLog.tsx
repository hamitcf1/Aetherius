import React, { useState } from 'react';
import { StoryChapter } from '../types';
import { Scroll, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import { generateLoreImage } from '../services/geminiService';

interface StoryLogProps {
  chapters: StoryChapter[];
  onUpdateChapter: (chapter: StoryChapter) => void;
}

export const StoryLog: React.FC<StoryLogProps> = ({ chapters, onUpdateChapter }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const sortedChapters = [...chapters].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8 p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2">The Chronicle</h1>
        <p className="text-gray-500 font-sans text-sm">The unfolding saga of your journey.</p>
      </div>

      <div className="space-y-12">
        {sortedChapters.map((chapter) => (
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
                     <Scroll className="text-skyrim-gold/20" size={40} />
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
                The pages are blank. Consult the Scribe to begin your tale.
            </div>
        )}
      </div>
    </div>
  );
};