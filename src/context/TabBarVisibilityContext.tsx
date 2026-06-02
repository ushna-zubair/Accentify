/**
 * Accentify - AI-Powered English Speech & Language Learning Interface
 * @author Manan Anghan
 * @team   Group Aivengers (Muhammad Ali, Manan Anghan, Adam Sabih, Ushna Zubair, Ahmed)
 */

/**
 * TabBarVisibilityContext
 *
 * Allows screens to signal scroll direction so the bottom tab bar can
 * hide on scroll-down and reappear on scroll-up.
 *
 * Usage in a screen:
 *   const { handleScroll } = useTabBarScroll();
 *   <ScrollView onScroll={handleScroll} scrollEventThrottle={16} … />
 */

import React, { createContext, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { Animated, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

interface TabBarVisibilityContextValue {
  /** Shared Animated.Value: 0 = visible, 1 = hidden */
  translateY: Animated.Value;
  /** Pass as onScroll to any ScrollView / FlatList */
  handleScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Force-hide the tab bar regardless of scroll position (e.g. modal-ish full-screen exercises) */
  setForceHidden: (hidden: boolean) => void;
}

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(null);

export const TabBarVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);
  const isHidden = useRef(false);
  const forceHidden = useRef(false);

  const show = useCallback(() => {
    if (forceHidden.current) return;
    if (!isHidden.current) return;
    isHidden.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [translateY]);

  const hide = useCallback(() => {
    if (isHidden.current) return;
    isHidden.current = true;
    Animated.spring(translateY, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [translateY]);

  const setForceHidden = useCallback(
    (hidden: boolean) => {
      forceHidden.current = hidden;
      if (hidden) {
        hide();
      } else {
        // Restore visibility when the override clears
        isHidden.current = true; // trick `show()` into running the animation
        show();
      }
    },
    [hide, show],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (forceHidden.current) return;
      const currentY = e.nativeEvent.contentOffset.y;
      const diff = currentY - lastOffsetY.current;

      // Only react after a meaningful scroll (> 8px)
      if (Math.abs(diff) < 8) return;

      if (currentY <= 0) {
        // At the very top – always show
        show();
      } else if (diff > 0) {
        // Scrolling down – hide
        hide();
      } else {
        // Scrolling up – show
        show();
      }
      lastOffsetY.current = currentY;
    },
    [show, hide],
  );

  const value = useMemo(
    () => ({ translateY, handleScroll, setForceHidden }),
    [translateY, handleScroll, setForceHidden],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>{children}</TabBarVisibilityContext.Provider>
  );
};

/** Hook for the tab bar component to read the animated value */
export const useTabBarVisibility = () => {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error('useTabBarVisibility must be inside TabBarVisibilityProvider');
  return ctx;
};

/** Convenience hook for screens — returns the onScroll handler */
export const useTabBarScroll = () => {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) {
    // Graceful fallback: if not wrapped, return a no-op
    return { handleScroll: () => {} };
  }
  return { handleScroll: ctx.handleScroll };
};

/**
 * Hide the tab bar while the calling screen is mounted (and restore on unmount).
 * Use on full-screen exercise / detail flows where the tab bar shouldn't be visible.
 */
export const useHideTabBar = () => {
  const ctx = useContext(TabBarVisibilityContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setForceHidden(true);
    return () => ctx.setForceHidden(false);
  }, [ctx]);
};
