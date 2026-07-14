import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { X, Search, Hash } from 'lucide-react';
import './SearchPopupModal.css';

export default function SearchPopupModal({ isOpen, onClose, onSelectForum }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      fetchInitialForums();
    } else {
      setSearchQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const fetchInitialForums = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forums')
      .select('*')
      .order('member_count', { ascending: false })
      .limit(5);
    
    if (data) setResults(data);
    if (error) console.error('Error fetching popular forums:', error);
    setLoading(false);
  };

  // Debounced/instant search using the Supabase RPC Full-Text Search function
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (isOpen) fetchInitialForums();
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase
        .rpc('search_forums', { query_text: searchQuery })
        .limit(10);
      
      if (data) setResults(data);
      if (error) console.error('Error searching forums:', error);
      setLoading(false);
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-popup" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search forums, descriptions, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="close-search-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="search-results-wrapper">
          {loading ? (
            <div className="search-state">Searching...</div>
          ) : results.length > 0 ? (
            <div className="search-results-list">
              <div className="search-label">
                {searchQuery ? 'Search Results' : 'Popular Forums'}
              </div>
              {results.map((forum) => (
                <div
                  key={forum.id}
                  className="search-result-item"
                  onClick={() => {
                    onSelectForum(forum);
                    onClose();
                  }}
                >
                  {forum.thumbnail_url ? (
                    <img
                      src={forum.thumbnail_url}
                      alt={forum.title}
                      className="search-result-thumb"
                    />
                  ) : (
                    <div className="search-result-thumb-placeholder">
                      <Hash size={16} />
                    </div>
                  )}
                  <div className="search-result-info">
                    <div className="search-result-title">{forum.title}</div>
                    <div className="search-result-description">
                      {forum.description ? (
                        forum.description.length > 80 
                          ? `${forum.description.slice(0, 80)}...` 
                          : forum.description
                      ) : (
                        'No description provided.'
                      )}
                    </div>
                    <div className="search-result-tags">
                      {forum.tags && forum.tags.map((tag) => (
                        <span key={tag} className="search-result-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="search-state">No forums found matching "{searchQuery}"</div>
          )}
        </div>
      </div>
    </div>
  );
}
