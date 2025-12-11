import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

const playToggleSound = (isDark: boolean) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    if (isDark) {
      // Moon sound - lower, softer, mysterious tone
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(280, audioContext.currentTime + 0.12);
    } else {
      // Sun sound - higher, brighter, cheerful tone
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(784, audioContext.currentTime + 0.12);
    }
    
    oscillator.type = 'sine';
    
    // Soft volume
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
    
    setTimeout(() => audioContext.close(), 200);
  } catch {
    // Silently fail
  }
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      playToggleSound(newTheme === 'dark');
      return newTheme;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
