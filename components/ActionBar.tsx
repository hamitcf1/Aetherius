import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, Users, LogOut, Sparkles, Image as ImageIcon, Download, Loader2, Plus, User, Snowflake } from 'lucide-react';
import SnowEffect from './SnowEffect';
import { useAppContext } from '../AppContext';
import { PREFERRED_AI_MODELS } from '../services/geminiService';

const ActionBar: React.FC = () => {
  const {
    handleManualSave,
    isSaving,
    handleLogout,
    setCurrentCharacterId,
    handleExportPDF,
    isExporting,
    handleGenerateProfileImage,
    isGeneratingProfileImage,
    handleCreateImagePrompt,
    handleUploadPhoto,
    aiModel,
    setAiModel
  } = useAppContext();
  const [open, setOpen] = useState(false);
  const [snow, setSnow] = useState(false);
  // Ref for the button to align dropdown
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{left: number, top: number, width: number}>({left: 0, top: 0, width: 220});

  const updateDropdownPos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        left: rect.left,
        top: rect.bottom + window.scrollY + 4,
        width: rect.width
      });
    }
  };

  const handleToggle = () => {
    setOpen((o) => {
      if (!o) {
        updateDropdownPos();
        window.addEventListener('scroll', updateDropdownPos);
        window.addEventListener('resize', updateDropdownPos);
      } else {
        window.removeEventListener('scroll', updateDropdownPos);
        window.removeEventListener('resize', updateDropdownPos);
      }
      return !o;
    });
  };

  // Clean up listeners if component unmounts while open
  React.useEffect(() => {
    return () => {
      window.removeEventListener('scroll', updateDropdownPos);
      window.removeEventListener('resize', updateDropdownPos);
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="bg-skyrim-gold text-skyrim-dark px-3 py-2 rounded shadow-lg font-bold flex items-center gap-2 relative overflow-hidden"
        style={{ marginLeft: 8, width: 110 }}
        aria-label={open ? 'Kapat' : 'Aç'}
      >
        <span style={{ position: 'relative', width: 20, height: 20, display: 'inline-block' }}>
          <Plus
            size={16}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: open ? 0 : 1,
              transform: open ? 'rotate(90deg) scale(0.7)' : 'rotate(0deg) scale(1)',
              transition: 'opacity 0.2s, transform 0.2s'
            }}
          />
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: open ? 1 : 0,
              transform: open ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.7)',
              transition: 'opacity 0.2s, transform 0.2s'
            }}
            aria-hidden={!open}
          >
            <rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor" />
          </svg>
        </span>
        Actions
      </button>
      {open && createPortal(
        <div
          className="bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2"
          style={{
            position: 'absolute',
            left: dropdownPos.left,
            top: dropdownPos.top,
            minWidth: dropdownPos.width,
            zIndex: 1000
          }}
        >
          {typeof setAiModel === 'function' && (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500 font-bold">AI Model</div>
              <select
                value={aiModel || 'gemini-2.0-flash'}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full bg-black/20 border border-skyrim-border text-gray-200 px-2 py-2 rounded focus:border-skyrim-gold focus:outline-none"
              >
                {PREFERRED_AI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="text-[10px] text-gray-500">
                Gemma models use <span className="font-mono">VITE_GEMMA_API_KEY</span> (recommended) or <span className="font-mono">GEMMA_API_KEY</span>/<span className="font-mono">gemma_api_key</span>.
              </div>
            </div>
          )}
          <button onClick={handleManualSave} disabled={isSaving} className="flex items-center gap-2 px-3 py-2 bg-skyrim-gold text-skyrim-dark rounded font-bold disabled:opacity-50">
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setCurrentCharacterId(null)} className="flex items-center gap-2 px-3 py-2 bg-skyrim-dark text-skyrim-gold rounded font-bold">
            <Users size={16} /> Switch
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-700 text-white rounded font-bold">
            <LogOut size={16} /> Exit
          </button>
          <button onClick={handleCreateImagePrompt} className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded font-bold">
            <Sparkles size={16} /> Create Image Prompt
          </button>
          <label className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded font-bold cursor-pointer">
            <ImageIcon size={16} /> Upload Photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadPhoto} />
          </label>
          <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 px-3 py-2 bg-skyrim-gold text-skyrim-dark rounded font-bold disabled:opacity-50">
            <Download size={16} /> {isExporting ? 'Generating...' : 'Export Full Record'}
          </button>
          <button onClick={handleGenerateProfileImage} disabled={isGeneratingProfileImage} className="flex items-center gap-2 px-3 py-2 bg-skyrim-accent text-white rounded font-bold disabled:opacity-50">
            {isGeneratingProfileImage ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
            {isGeneratingProfileImage ? 'Generating...' : 'Generate Profile Photo'}
          </button>
          <button onClick={() => setSnow((s) => !s)} className={`flex items-center gap-2 px-3 py-2 rounded font-bold ${snow ? 'bg-blue-200 text-blue-900' : 'bg-blue-900 text-white'}`}>
            <Snowflake size={16} /> {snow ? 'Disable Snow Effect' : 'Snow Effect'}
          </button>
        </div>,
        document.body
      )}
      {snow && <SnowEffect />}
    </>
  );
};

export const ActionBarToggle = ActionBar;
export default ActionBar;