import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeOption, AccentColor, FontSizeOption, AppPreferenceState } from '../models';

// Re-export for backward compatibility
export type { ThemeOption, AccentColor, FontSizeOption, AppPreferenceState };

interface AppPreferenceContextType extends AppPreferenceState {
  setTheme: (value: ThemeOption) => void;
  setAccentColor: (value: AccentColor) => void;
  setFontSize: (value: FontSizeOption) => void;
  setHighContrastMode: (value: boolean) => void;
}

const STORAGE_KEY = '@app_preference_settings';

const defaultState: AppPreferenceState = {
  theme: 'Light',
  accentColor: 'Lavender',
  fontSize: 'Medium',
  highContrastMode: false,
};

const AppPreferenceContext = createContext<AppPreferenceContextType | undefined>(undefined);

export const AppPreferenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppPreferenceState>(defaultState);

  const persist = useCallback(async (newState: AppPreferenceState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Failed to persist app preference settings', e);
    }
  }, []);

  // Load saved settings on mount
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState({ ...defaultState, ...JSON.parse(raw) });
        }
      } catch (e) {
        console.warn('Failed to load app preference settings', e);
      }
    })();
  }, []);

  const update = useCallback(
    (patch: Partial<AppPreferenceState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value: AppPreferenceContextType = {
    ...state,
    setTheme: (v) => update({ theme: v }),
    setAccentColor: (v) => update({ accentColor: v }),
    setFontSize: (v) => update({ fontSize: v }),
    setHighContrastMode: (v) => update({ highContrastMode: v }),
  };

  return (
    <AppPreferenceContext.Provider value={value}>
      {children}
    </AppPreferenceContext.Provider>
  );
};

export const useAppPreference = (): AppPreferenceContextType => {
  const ctx = useContext(AppPreferenceContext);
  if (!ctx) {
    throw new Error('useAppPreference must be used within an AppPreferenceProvider');
  }
  return ctx;
};

export default AppPreferenceContext;
