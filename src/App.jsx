import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import HeroSection from './components/HeroSection';
import ForumCard from './components/ForumCard';
import AuthModal from './components/AuthModal';
import ChatRoom from './components/ChatRoom';
import CreateForumModal from './components/CreateForumModal';
import SearchPopupModal from './components/SearchPopupModal';
import Logo from './components/Logo';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { Plus, Search } from 'lucide-react';
import './App.css';

function Home({ user, onRequireAuth, theme, onSetTheme }) {
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [categories, setCategories] = useState(['All', 'Technology', 'Design', 'Development', 'General', 'Gaming', 'Science']);

  useEffect(() => {
    fetchForums();
    fetchTagsList();
  }, []);

  const fetchForums = async () => {
    const { data } = await supabase.from('forums').select('*').order('created_at', { ascending: false });
    if (data) setForums(data);
  };

  const fetchTagsList = async () => {
    const { data } = await supabase.from('tags').select('name').order('name', { ascending: true });
    if (data && data.length > 0) {
      const dbCategories = ['All', ...data.map(t => t.name)];
      // Keep only unique categories
      setCategories(Array.from(new Set(dbCategories)));
    }
  };

  const handleForumClick = (forum) => {
    if (!user) {
      onRequireAuth();
    } else {
      navigate(`/forum/${forum.id}`);
    }
  };

  const handleCreateClick = () => {
    if (!user) {
      onRequireAuth();
    } else {
      setShowCreateModal(true);
    }
  };

  const handleSelectSearchResult = (forum) => {
    if (!user) {
      onRequireAuth();
    } else {
      navigate(`/forum/${forum.id}`);
    }
  };

  const filteredForums = activeCategory === 'All'
    ? forums
    : forums.filter(f => f.tags && f.tags.includes(activeCategory));

  return (
    <div className="app-container">
      <header className="main-header">
        <Logo size={32} />
        <div className="header-actions">
          <button className="btn-secondary search-trigger-btn" onClick={() => setShowSearchModal(true)}>
            <Search size={16} /> Search
          </button>
          <ThemeToggle theme={theme} onSetTheme={onSetTheme} />
          {user && (
            <button className="btn-primary create-btn" onClick={handleCreateClick}>
              <Plus size={16} /> New Forum
            </button>
          )}
          {user ? (
            <button className="btn-secondary" onClick={() => supabase.auth.signOut()}>Sign Out</button>
          ) : (
            <button className="btn-primary" onClick={onRequireAuth}>Sign In</button>
          )}
        </div>
      </header>

      <main>
        <HeroSection 
          onExploreClick={() => setShowSearchModal(true)} 
          onStartTopicClick={handleCreateClick} 
        />

        <section className="categories-section">
          <div className="category-tags">
            {categories.map(cat => (
              <span
                key={cat}
                className={`cat-tag ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </span>
            ))}
          </div>
        </section>

        <section className="feed-section">
          <div className="feed-header">
            <h2 className="section-title">Trending Discussions</h2>
          </div>
          <div className="forum-grid">
            {filteredForums.map(forum => (
              <ForumCard key={forum.id} forum={forum} onClick={handleForumClick} />
            ))}
            {filteredForums.length === 0 && (
              <div className="empty-state">No forums found. Be the first to start a topic!</div>
            )}
          </div>
        </section>
      </main>

      <CreateForumModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        user={user}
        onCreated={() => {
          fetchForums();
          fetchTagsList();
        }}
      />

      <SearchPopupModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectForum={handleSelectSearchResult}
      />
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setShowAuthModal(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRequireAuth = () => {
    setShowAuthModal(true);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <Routes>
          <Route path="/" element={
            <Home
              user={session?.user}
              onRequireAuth={handleRequireAuth}
              theme={theme}
              onSetTheme={setTheme}
            />
          } />
          <Route path="/forum/:id" element={
            session?.user ? (
              <ChatRoomWrapper user={session.user} />
            ) : (
              <div className="require-auth-page">
                <h2>Authentication Required</h2>
                <button className="btn-primary" onClick={handleRequireAuth}>Sign In to Access Chat</button>
              </div>
            )
          } />
        </Routes>

        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </Router>
  );
}

function ChatRoomWrapper({ user }) {
  const { id } = useParams();
  return <ChatRoom user={user} currentForumId={id} />;
}

export default App;
