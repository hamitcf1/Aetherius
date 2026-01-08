import React, { useState } from 'react';
import { Save, Users, LogOut, Sparkles, Image as ImageIcon, Download, Loader2, Plus, User } from 'lucide-react';
import { useAppContext } from '../AppContext';

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
    handleUploadPhoto
  } = useAppContext();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-16 right-4 z-50">
      <button onClick={() => setOpen(o => !o)} className="bg-skyrim-gold text-skyrim-dark px-3 py-2 rounded shadow-lg font-bold flex items-center gap-2">
        <Plus size={16} /> Actions
      </button>
      {open && (
        <div className="mt-2 bg-skyrim-paper border border-skyrim-gold rounded-lg shadow-2xl p-4 flex flex-col gap-3 min-w-[220px] animate-in fade-in slide-in-from-top-2">
          <button onClick={handleManualSave} disabled={isSaving} className="flex items-center gap-2 px-3 py-2 bg-skyrim-gold text-skyrim-dark rounded font-bold disabled:opacity-50">
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setCurrentCharacterId(null)} className="flex items-center gap-2 px-3 py-2 bg-skyrim-dark text-skyrim-gold rounded font-bold">
            <Users size={16} /> Switch
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 bg-red-700 text-white rounded font-bold">
            <LogOut size={16} /> Logout
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
        </div>
      )}
    </div>
  );
};

export const ActionBarToggle = () => null; // Placeholder for nav
export default ActionBar;