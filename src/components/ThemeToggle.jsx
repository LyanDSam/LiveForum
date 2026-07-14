import React, { useState, useRef, useEffect } from 'react';
import { Palette, ChevronDown, Check } from 'lucide-react';
import { THEMES } from '../hooks/useTheme';
import './ThemeToggle.css';

export default function ThemeToggle({ theme, onSetTheme }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onSetTheme(id);
    setOpen(false);
  };

  return (
    <div className="theme-dropdown" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        className="theme-trigger"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Change theme"
        aria-expanded={open}
      >
        {/* Live swatch of current theme */}
        <span
          className="theme-swatch"
          style={{ background: currentTheme.accent }}
        />
        <Palette size={15} />
        <span className="theme-trigger-label">{currentTheme.label}</span>
        <ChevronDown
          size={14}
          className={`theme-chevron ${open ? 'open' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="theme-panel" role="listbox" aria-label="Theme options">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`theme-option ${t.id === theme ? 'active' : ''}`}
              onClick={() => handleSelect(t.id)}
              role="option"
              aria-selected={t.id === theme}
            >
              {/* Two-tone swatch: outer = bg, inner = accent */}
              <span
                className="option-swatch"
                style={{ background: t.bg, border: `2px solid ${t.accent}` }}
              >
                <span
                  className="option-swatch-dot"
                  style={{ background: t.accent }}
                />
              </span>
              <span className="option-label">{t.label}</span>
              {t.id === theme && <Check size={13} className="option-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
