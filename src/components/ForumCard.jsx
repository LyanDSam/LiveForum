import React from 'react';
import { Users } from 'lucide-react';
import './ForumCard.css';

export default function ForumCard({ forum, onClick }) {
  return (
    <div className="forum-card" onClick={() => onClick(forum)}>
      <div className="card-thumbnail" style={{ backgroundImage: `url(${forum.thumbnail_url || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=400'})` }}>
      </div>
      <div className="card-content">
        <h3 className="card-title">{forum.title}</h3>
        <div className="card-meta">
          <span className="member-count">
            <Users size={14} />
            {forum.member_count || 0} members
          </span>
        </div>
        <div className="card-tags">
          {forum.tags && forum.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
