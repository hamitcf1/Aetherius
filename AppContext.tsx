import React, { createContext, useContext } from 'react';
import type { InventoryItem } from './types';
import type { RestOptions } from './components/SurvivalModals';
import type { ShopItem } from './components/ShopModal';

export interface AppContextType {
  handleManualSave: () => void;
  isSaving: boolean;
  handleLogout: () => void;
  setCurrentCharacterId: (id: string | null) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  handleExportPDF: () => void;
  isExporting: boolean;
  handleGenerateProfileImage: () => void;
  isGeneratingProfileImage: boolean;
  handleCreateImagePrompt: () => void;
  handleUploadPhoto: () => void;
  // Survival (now with modals)
  handleRestWithOptions: (options: RestOptions) => void;
  handleEatItem: (item: InventoryItem) => void;
  handleDrinkItem: (item: InventoryItem) => void;
  // Shop
  handleShopPurchase: (item: ShopItem, quantity: number) => void;
  gold: number;
  inventory: InventoryItem[];
  hasCampingGear: boolean;
  hasBedroll: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider');
  return ctx;
};