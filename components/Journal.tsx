import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { Book, Calendar, Trash2, Search, X } from 'lucide-react';

const uniqueId = () => Math.random().toString(36).substr(2, 9);

interface JournalProps {
  entries: JournalEntry[];
  setEntries: (entries: JournalEntry[]) => void;
}

const getSkyrimDate = () => {
  const now = new Date();
  const months = [
      "Morning Star", "Sun's Dawn", "First Seed", "Rain's Hand", 
      "Second Seed", "Mid Year", "Sun's Height", "Last Seed", 
      "Hearthfire", "Frostfall", "Sun's Dusk", "Evening Star"
  ];
  
  const monthName = months[now.getMonth()];
  const day = now.getDate();
  
  const getSuffix = (n: number) => {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  return `4E 201, ${monthName}, ${day}${getSuffix(day)}`;
};

export const Journal: React.FC<JournalProps> = ({ entries, setEntries }) => {
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const addEntry = () => {
    if (!newEntryContent.trim()) return;
    const entry: JournalEntry = {
        id: uniqueId(),
        date: getSkyrimDate(),
        title: newEntryTitle || 'Untitled Entry',
        content: newEntryContent
    };
    setEntries([entry, ...entries]);
    setNewEntryContent('');
    setNewEntryTitle('');
  };

  const deleteEntry = (id: string) => {
      setEntries(entries.filter(e => e.id !== id));
  };

  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8 p-6 bg-skyrim-paper border-y-4 border-skyrim-gold/30 text-center">
        <h1 className="text-4xl font-serif text-skyrim-gold mb-2">Adventurer's Journal</h1>
        <p className="text-gray-500 font-sans text-sm">Thoughts, observations, and discoveries.</p>
      </div>

      <div className="bg-skyrim-paper/50 p-6 rounded border border-skyrim-border mb-8">
          <input 
            className="w-full bg-transparent border-b border-skyrim-border/50 text-xl font-sans text-skyrim-gold placeholder-gray-600 mb-4 focus:outline-none focus:border-skyrim-gold p-2"
            placeholder="Entry Title..."
            value={newEntryTitle}
            onChange={(e) => setNewEntryTitle(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <textarea
            className="w-full bg-black/20 border border-skyrim-border/30 rounded p-4 text-gray-300 font-sans leading-relaxed focus:outline-none focus:border-skyrim-gold/50 h-40"
            placeholder="Write your thoughts here..."
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
          />
          <div className="flex justify-end mt-4">
              <button 
                onClick={addEntry}
                disabled={!newEntryContent.trim()}
                className="px-6 py-2 bg-skyrim-gold/80 hover:bg-skyrim-gold text-skyrim-dark font-bold rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Book size={18} />
                Add Entry
            </button>
          </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <Search size={18} />
          </div>
          <input 
            type="text" 
            className="w-full bg-black/40 border border-skyrim-border rounded pl-10 pr-10 py-3 text-gray-300 focus:outline-none focus:border-skyrim-gold"
            placeholder="Search journal entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                  <X size={18} />
              </button>
          )}
      </div>

      <div className="space-y-8 relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-skyrim-border/30 hidden md:block"></div>
          {filteredEntries.map(entry => (
              <div key={entry.id} className="relative md:pl-12 group">
                   <div className="hidden md:block absolute left-[11px] top-6 w-3 h-3 bg-skyrim-gold rounded-full border-2 border-skyrim-dark z-10"></div>
                   <div className="bg-skyrim-paper p-6 rounded border border-skyrim-border shadow-lg hover:border-skyrim-gold/30 transition-colors">
                       <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-2">
                           <div>
                               <h3 className="text-xl font-serif text-gray-200">{entry.title}</h3>
                               <span className="text-xs text-skyrim-gold/70 flex items-center gap-1 mt-1">
                                   <Calendar size={12} /> {entry.date}
                               </span>
                           </div>
                           <button onClick={() => deleteEntry(entry.id)} className="text-gray-600 hover:text-red-500 p-2">
                               <Trash2 size={16} />
                           </button>
                       </div>
                       <p className="text-gray-400 font-serif whitespace-pre-wrap leading-7">
                           {entry.content}
                       </p>
                   </div>
              </div>
          ))}
          {filteredEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500 italic">No entries found matching your search.</div>
          )}
      </div>
    </div>
  );
};