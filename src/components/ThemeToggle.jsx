import React from 'react';
import { Sun, Moon, Eye } from 'lucide-react';
import './ThemeToggle.css';

const THEME_CONFIG = {
  light:    { icon: Sun,  label: 'Light',    next: 'Dark' },
  dark:     { icon: Moon, label: 'Dark',     next: 'Contrast' },
  contrast: { icon: Eye,  label: 'Contrast', next: 'Light' },
};

export default function ThemeToggle({ theme, onToggle }) {
  const config = THEME_CONFIG[theme] || THEME_CONFIG.light;
  const Icon = config.icon;

  return (
    <button
      className="theme-toggle-btn"
      onClick={onToggle}
      title={`Current: ${config.label} — click for ${config.next}`}
      aria-label={`Switch to ${config.next} theme`}
    >
      <Icon size={17} className="theme-icon" />
      <span className="theme-label">{config.label}</span>
    </button>
  );
}
