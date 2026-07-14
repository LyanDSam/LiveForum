import { useState, useEffect } from 'react';

const THEMES = ['light', 'dark', 'contrast'];

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('liveforum-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liveforum-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex]);
  };

  return { theme, cycleTheme };
}
