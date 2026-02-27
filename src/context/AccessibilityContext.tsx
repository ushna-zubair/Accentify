import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorBlindMode, FontStyleOption, AccessibilityState } from '../models';

// Re-export for backward compatibility
export type { ColorBlindMode, FontStyleOption, AccessibilityState };

interface AccessibilityContextType extends AccessibilityState {
  setTextToSpeech: (value: boolean) => void;
  setColorBlindMode: (mode: ColorBlindMode) => void;
  setFontStyle: (style: FontStyleOption) => void;
  setTranscript: (value: boolean) => void;
  setReduceAnimation: (value: boolean) => void;
  setHighContrastMode: (value: boolean) => void;
}

const STORAGE_KEY = '@accessibility_settings';

const defaultState: AccessibilityState = {
  textToSpeech: true,
  colorBlindMode: 'None',
  fontStyle: 'Standard',
  transcript: true,
  reduceAnimation: true,
  highContrastMode: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>(defaultState);

  const persist = useCallback(async (newState: AccessibilityState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.warn('Failed to persist accessibility settings', e);
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
        console.warn('Failed to load accessibility settings', e);
      }
    })();
  }, []);

  const update = useCallback(
    (patch: Partial<AccessibilityState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value: AccessibilityContextType = {
    ...state,
    setTextToSpeech: (v) => update({ textToSpeech: v }),
    setColorBlindMode: (v) => update({ colorBlindMode: v }),
    setFontStyle: (v) => update({ fontStyle: v }),
    setTranscript: (v) => update({ transcript: v }),
    setReduceAnimation: (v) => update({ reduceAnimation: v }),
    setHighContrastMode: (v) => update({ highContrastMode: v }),
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
};

export default AccessibilityContext;
