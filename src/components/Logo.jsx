import React from 'react';

export default function Logo({ size = 32, showText = true, className = '' }) {
  return (
    <div className={`logo-wrapper ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Outer speech bubble */}
        <path 
          d="M 50,14 A 34,34 0 0,1 84,48 A 34,34 0 0,1 50,82 C 43,82 36,84 27,90 C 24,92 21,90 22,86 C 24,78 23,73 19,67 A 34,34 0 0,1 16,48 A 34,34 0 0,1 50,14 Z" 
          stroke="var(--accent)" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        {/* Stylized 1 inside the bubble */}
        <path 
          d="M 37,47 C 41,45 47,39 47,34 L 47,66" 
          stroke="var(--accent)" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        {/* Dot next to the 1 */}
        <circle cx="61" cy="50" r="5.5" fill="var(--accent)" />
      </svg>
      {showText && (
        <span 
          className="logo-text" 
          style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            letterSpacing: '-0.03em', 
            display: 'inline-flex',
            userSelect: 'none'
          }}
        >
          <span style={{ color: 'var(--accent)' }}>Live</span>
          <span style={{ color: 'var(--text-primary)' }}>Forum</span>
        </span>
      )}
    </div>
  );
}
