import { useState, useCallback } from 'react';

interface UseCodeInputReturn {
  /** Current array of digit strings (empty string = unfilled) */
  code: string[];
  /** Handle a keypad press — digit character or 'backspace' */
  handleKeyPress: (key: string) => void;
  /** True when every slot is filled */
  isComplete: boolean;
  /** Index of the first empty slot (-1 when complete) */
  activeIndex: number;
  /** Reset all slots to empty */
  reset: () => void;
  /** Joined string of all digits */
  value: string;
}

/**
 * Reusable hook for fixed-length numeric code input (OTP, PIN, authenticator).
 *
 * @param length - Number of digits expected (e.g. 4 for PIN, 6 for authenticator)
 */
export function useCodeInput(length: number): UseCodeInputReturn {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));

  const handleKeyPress = useCallback(
    (key: string) => {
      if (key === 'backspace') {
        setCode((prev) => {
          let lastFilledIndex = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i] !== '') {
              lastFilledIndex = i;
              break;
            }
          }
          if (lastFilledIndex < 0) return prev;
          const next = [...prev];
          next[lastFilledIndex] = '';
          return next;
        });
      } else if (/^\d$/.test(key)) {
        setCode((prev) => {
          const firstEmpty = prev.indexOf('');
          if (firstEmpty < 0 || firstEmpty >= length) return prev;
          const next = [...prev];
          next[firstEmpty] = key;
          return next;
        });
      }
      // Ignore non-digit, non-backspace keys (e.g. '*', '')
    },
    [length],
  );

  const reset = useCallback(() => {
    setCode(Array(length).fill(''));
  }, [length]);

  const isComplete = code.every((d) => d !== '');
  const activeIndex = code.indexOf('');
  const value = code.join('');

  return { code, handleKeyPress, isComplete, activeIndex, reset, value };
}
