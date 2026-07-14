import React from 'react';
import './HeroSection.css';
import { MessageSquare } from 'lucide-react';

export default function HeroSection({ onExploreClick, onStartTopicClick }) {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1>Where Communities Come Alive.</h1>
        <p>Join minimalist, realtime discussions. Share ideas, upload moments, and connect with people instantly without the noise.</p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={onExploreClick}>Explore Forums</button>
          <button className="btn-secondary" onClick={onStartTopicClick}>Start a Topic</button>
        </div>
      </div>
      <div className="hero-visual">
        <div className="animation-placeholder">
          {/* Lottie/SVG Animation Placeholder */}
          <MessageSquare size={64} className="floating-icon" strokeWidth={1.5} color="var(--accent)" />
          <div className="pulse-circle"></div>
        </div>
      </div>
    </section>
  );
}
