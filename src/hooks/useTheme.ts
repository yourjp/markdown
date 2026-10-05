import { useState, useEffect } from 'react';
import { ThemeMode } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'sepia') return saved as ThemeMode;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'sepia');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'sepia') {
      root.classList.add('sepia');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'sepia';
      if (prev === 'sepia') return 'dark';
      return 'light';
    });
  };

  const setSpecificTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  return { theme, toggleTheme, setTheme: setSpecificTheme };
}
