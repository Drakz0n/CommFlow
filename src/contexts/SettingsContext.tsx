import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { BackupManager } from '../utils/backupManager';

export interface SettingsState {
  animations: boolean;
  userName: string;
  // Extensible design allows adding new preferences without breaking existing code
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (updates: Partial<SettingsState>) => void;
  toggleAnimations: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

/**
 * App-wide user preferences that persist across sessions.
 * These aren't business data, just UI/UX preferences.
 */
const defaultSettings: SettingsState = {
  animations: true,
  userName: 'User',
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Load preferences on app startup with graceful degradation.
   * If settings are corrupted, we fall back to defaults rather than crash.
   */
  useEffect(() => {
    try {
      console.log('SettingsContext: Loading settings from localStorage'); // Debug logging
      const savedSettings = BackupManager.loadWithBackupFallback('settings');
      console.log('SettingsContext: Loaded settings:', savedSettings); // Debug logging
      if (savedSettings && typeof savedSettings === 'object') {
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        console.log('SettingsContext: Merged with defaults:', mergedSettings); // Debug logging
        setSettings(mergedSettings);
      } else {
        console.log('SettingsContext: No saved settings found, using defaults'); // Debug logging
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
      setSettings(defaultSettings);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * Auto-save preferences so users don't lose their customizations.
   * Every change persists immediately to avoid the frustration of reconfiguring.
   * Only save after initial load to prevent overwriting saved settings.
   */
  useEffect(() => {
    if (!isInitialized) return; // Don't save during initial load
    
    try {
      console.log('SettingsContext: Saving settings to localStorage:', settings); // Debug logging
      BackupManager.saveWithBackup('settings', settings);
      console.log('SettingsContext: Settings saved successfully'); // Debug logging
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  }, [settings, isInitialized]);

  const updateSettings = (updates: Partial<SettingsState>) => {
    console.log('SettingsContext: updateSettings called with:', updates); // Debug logging
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      console.log('SettingsContext: New settings state:', newSettings); // Debug logging
      return newSettings;
    });
  };

  const toggleAnimations = () => {
    setSettings(prev => ({ ...prev, animations: !prev.animations }));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      toggleAnimations
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
