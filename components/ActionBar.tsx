import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, Users, LogOut, Sparkles, Image as ImageIcon, Download, Loader2, Plus, Snowflake, ShoppingBag, Coins, X, ChevronDown } from 'lucide-react';
import SnowEffect, { SnowSettings } from './SnowEffect';
import { useAppContext } from '../AppContext';
import { isFeatureEnabled, isFeatureWIP, getFeatureLabel } from '../featureFlags';
import { PREFERRED_AI_MODELS } from '../services/geminiService';
import { ShopModal } from './ShopModal.tsx';

type SnowIntensity = SnowSettings['intensity'];

const SNOW_INTENSITY_OPTIONS: Array<{ value: SnowIntensity; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'normal', label: 'Normal' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'blizzard', label: 'Blizzard' },
];

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
    handleShopPurchase,
    handleShopSell,
    gold,
    inventory,
    aiModel,
    setAiModel,
    characterLevel
  } = useAppContext();
  const [open, setOpen] = useState(false);
  const [snow, setSnow] = useState(false);
  const [snowIntensity, setSnowIntensity] = useState<SnowIntensity>('normal');
  const [showSnowOptions, setShowSnowOptions] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  // Ref for the button to align dropdown
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{left: number, top: number, width: number}>({left: 0, top: 0, width: 220});

  const updateDropdownPos = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth || 0;
      const padding = 8;
      const desiredWidth = Math.max(240, rect.width);
      const width = Math.max(0, Math.min(desiredWidth, viewportWidth - padding * 2));
      const maxLeft = Math.max(padding, viewportWidth - width - padding);
      const left = Math.min(Math.max(padding, rect.left), maxLeft);
      setDropdownPos({
        left,
        top: rect.bottom + 4,
        width
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
        className="bg-skyrim-gold text-skyrim-dark px-3 py-2 rounded shadow-lg font-bold flex items-center gap-2 relative overflow-hidden shrink-0"
        aria-label={open ? 'Close actions menu' : 'Open actions menu'}
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
            position: 'fixed',
            left: dropdownPos.left,
            top: dropdownPos.top,
            minWidth: dropdownPos.width,
            maxWidth: 'calc(100vw - 16px)',
            zIndex: 1000
          }}
        >
          {typeof setAiModel === 'function' && (
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500 font-bold">AI Model</div>
              <select
                value={aiModel || 'gemma-3-27b-it'}
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
          <button onClick={handleManualSave} disabled={isSaving} className="w-full flex items-center gap-2 px-3 py-2 bg-skyrim-gold text-skyrim-dark rounded font-bold disabled:opacity-50">
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setCurrentCharacterId(null)} className="w-full flex items-center gap-2 px-3 py-2 bg-skyrim-dark text-skyrim-gold rounded font-bold">
            <Users size={16} /> Switch
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 bg-red-700 text-white rounded font-bold">
            <LogOut size={16} /> Exit
          </button>
          <button onClick={handleCreateImagePrompt} className="w-full flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded font-bold">
            <Sparkles size={16} /> Create Image Prompt
          </button>
          
          {/* Upload Photo - show as disabled if feature not enabled */}
          <div className="relative group">
            <label 
              className={`w-full flex items-center gap-2 px-3 py-2 rounded font-bold ${
                isFeatureEnabled('photoUpload') 
                  ? 'bg-green-700 text-white cursor-pointer hover:bg-green-600' 
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <ImageIcon size={16} /> Upload Photo
              {isFeatureEnabled('photoUpload') && (
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadPhoto} />
              )}
            </label>
            {!isFeatureEnabled('photoUpload') && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {getFeatureLabel('photoUpload') || 'Work in Progress'}
              </div>
            )}
          </div>
          
          {/* Export PDF - show as disabled if feature not enabled */}
          <div className="relative group">
            <button 
              onClick={isFeatureEnabled('exportPDF') ? handleExportPDF : undefined}
              disabled={!isFeatureEnabled('exportPDF') || isExporting}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded font-bold ${
                isFeatureEnabled('exportPDF')
                  ? 'bg-skyrim-gold text-skyrim-dark hover:bg-yellow-400 disabled:opacity-50'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Download size={16} /> {isExporting ? 'Generating...' : 'Export Full Record'}
            </button>
            {!isFeatureEnabled('exportPDF') && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {getFeatureLabel('exportPDF') || 'Work in Progress'}
              </div>
            )}
          </div>

          {/* Shop Button */}
          <div className="border-t border-skyrim-border/60 pt-3">
            <button 
              onClick={() => { setShopOpen(true); setOpen(false); }} 
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-700 text-white rounded font-bold hover:bg-amber-600"
            >
              <ShoppingBag size={16} /> 
              <span>Shop</span>
              <span className="ml-auto flex items-center gap-1 text-yellow-300">
                <Coins size={14} /> {gold}
              </span>
            </button>
          </div>

          {/* AI Profile Image - show as disabled if feature not enabled */}
          <div className="relative group">
            <button 
              onClick={isFeatureEnabled('aiProfileImage') ? handleGenerateProfileImage : undefined}
              disabled={!isFeatureEnabled('aiProfileImage') || isGeneratingProfileImage}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded font-bold ${
                isFeatureEnabled('aiProfileImage')
                  ? 'bg-skyrim-accent text-white hover:bg-purple-700 disabled:opacity-50'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              {isGeneratingProfileImage ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
              {isGeneratingProfileImage ? 'Generating...' : 'Generate Profile Photo'}
            </button>
            {!isFeatureEnabled('aiProfileImage') && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {getFeatureLabel('aiProfileImage') || 'Work in Progress'}
              </div>
            )}
          </div>
          
          {/* Snow Effect - show as disabled if feature not enabled */}
          <div className="relative group">
            <div className="flex gap-1">
              <button 
                onClick={isFeatureEnabled('snowEffect') ? () => setSnow((s) => !s) : undefined}
                disabled={!isFeatureEnabled('snowEffect')}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-l font-bold ${
                  isFeatureEnabled('snowEffect')
                    ? (snow ? 'bg-blue-200 text-blue-900' : 'bg-blue-900 text-white hover:bg-blue-800')
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <Snowflake size={16} /> {snow ? 'Disable Snow Effect' : 'Snow Effect'}
              </button>
              {isFeatureEnabled('snowEffect') && snow && (
                <button
                  onClick={() => setShowSnowOptions(s => !s)}
                  className="px-2 py-2 bg-blue-200 text-blue-900 rounded-r border-l border-blue-300 hover:bg-blue-100"
                  title="Snow settings"
                >
                  <ChevronDown size={16} className={showSnowOptions ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
              )}
            </div>
            {/* Snow intensity options */}
            {snow && showSnowOptions && isFeatureEnabled('snowEffect') && (
              <div className="mt-2 p-2 bg-gray-800 rounded border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Snow Intensity</div>
                <div className="flex flex-wrap gap-1">
                  {SNOW_INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSnowIntensity(opt.value)}
                      className={`px-2 py-1 text-xs rounded ${
                        snowIntensity === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isFeatureEnabled('snowEffect') && (
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                {getFeatureLabel('snowEffect') || 'Work in Progress'}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {snow && <SnowEffect settings={{ intensity: snowIntensity }} />}
      <ShopModal 
        open={shopOpen} 
        onClose={() => setShopOpen(false)} 
        gold={gold} 
        onPurchase={handleShopPurchase}
        inventory={inventory}
        onSell={handleShopSell}
        characterLevel={characterLevel}
      />
    </>
  );
};

export const ActionBarToggle = ActionBar;
export default ActionBar;