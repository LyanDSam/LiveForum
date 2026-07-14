import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'light',       label: 'Light',        accent: '#2563EB', bg: '#F8F9FA' },
  { id: 'dark',        label: 'Dark',         accent: '#3B82F6', bg: '#1E293B' },
  { id: 'contrast',    label: 'Contrast',     accent: '#FACC15', bg: '#000000' },
  { id: 'green-tea',   label: 'Green Tea',    accent: '#16A34A', bg: '#F0FDF4' },
  { id: 'blue-ocean',  label: 'Blue Ocean',   accent: '#0284C7', bg: '#EFF6FF' },
  { id: 'purple-block',label: 'Purple Block', accent: '#7C3AED', bg: '#FAF5FF' },
  { id: 'vampire',     label: 'Vampire',      accent: '#EF233C', bg: '#1A000A' },
  { id: 'sunny',       label: 'Sunny',        accent: '#D97706', bg: '#FFFBEB' },
];

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('liveforum-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('liveforum-theme', theme);
  }, [theme]);

  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  return { theme, setTheme, currentTheme };
}
