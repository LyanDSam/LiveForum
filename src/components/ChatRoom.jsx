import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { compressImage } from '../utils/imageCompression';
import {
  Send, Image as ImageIcon, Info, Hash, Trash2, ArrowLeft,
  X, FileImage, FileText, FileVideo, File as FileGeneric
} from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';
import './ChatRoom.css';
import { useNavigate } from 'react-router-dom';

// ── Helper: get icon + label based on file extension ──
function getFileTypeInfo(file) {
  if (!file) return { icon: FileGeneric, label: 'File', color: '#6B7280' };
  const ext = file.name.split('.').pop().toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (['jpg', 'jpeg'].includes(ext) || mimeType === 'image/jpeg') {
    return { icon: FileImage, label: 'JPEG', color: '#F59E0B' };
  }
  if (ext === 'png' || mimeType === 'image/png') {
    return { icon: FileImage, label: 'PNG', color: '#3B82F6' };
  }
  if (ext === 'gif' || mimeType === 'image/gif') {
    return { icon: FileImage, label: 'GIF', color: '#8B5CF6' };
  }
  if (ext === 'webp' || mimeType === 'image/webp') {
    return { icon: FileImage, label: 'WEBP', color: '#10B981' };
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext) || mimeType.startsWith('video/')) {
    return { icon: FileVideo, label: ext.toUpperCase(), color: '#EF4444' };
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
    return { icon: FileText, label: ext.toUpperCase(), color: '#6366F1' };
  }
  return { icon: FileGeneric, label: ext.toUpperCase() || 'FILE', color: '#6B7280' };
}

export default function ChatRoom({ user, currentForumId }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [forums, setForums] = useState([]);
  const [currentForum, setCurrentForum] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Preview state ──
  const [pendingFile, setPendingFile] = useState(null); // File object

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const presenceChannelRef = useRef(null);

  const isOwner = currentForum && user && currentForum.created_by === user.id;

  // ── Data fetching ──
  useEffect(() => {
    if (!user) return;
    fetchForums();
  }, [user]);

  useEffect(() => {
    if (!user || !currentForumId) return;

    fetchForumDetails(currentForumId);
    fetchMessages(currentForumId);

    // Realtime messages subscription
    const msgChannel = supabase.channel(`messages:${currentForumId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `forum_id=eq.${currentForumId}`
      }, async (payload) => {
        const { data: profileData } = await supabase
          .from('profiles').select('username, avatar_url')
          .eq('id', payload.new.user_id).single();
        setMessages(prev => [...prev, { ...payload.new, profiles: profileData }]);
      })
      .subscribe();

    // Presence channel for typing indicator
    const presenceChannel = supabase.channel(`presence:${currentForumId}`, {
      config: { presence: { key: user.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing = [];
        Object.entries(state).forEach(([key, presences]) => {
          presences.forEach(p => {
            if (p.is_typing && key !== user.id) {
              typing.push(p.username || 'Someone');
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            is_typing: false,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'User'
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, currentForumId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchForums = async () => {
    const { data } = await supabase.from('forums').select('*').order('created_at', { ascending: false });
    if (data) setForums(data);
  };

  const fetchForumDetails = async (id) => {
    const { data } = await supabase.from('forums').select('*').eq('id', id).single();
    if (data) setCurrentForum(data);
  };

  const fetchMessages = async (forumId) => {
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username, avatar_url)')
      .eq('forum_id', forumId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  // ── Typing indicator logic (debounced) ──
  const broadcastTyping = useCallback((isTyping) => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.track({
      is_typing: isTyping,
      username: user.user_metadata?.username || user.email?.split('@')[0] || 'User'
    });
  }, [user]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 2000);
  };

  // ── File selection → set preview, do NOT upload yet ──
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
  };

  // ── Clear pending file ──
  const handleClearFile = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Send message (compress + upload on submit) ──
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() && !pendingFile) return;

    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let imageUrl = null;

    if (pendingFile) {
      setUploading(true);
      try {
        const compressedFile = await compressImage(pendingFile);
        const fileName = `${user.id}/${Date.now()}_${compressedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, compressedFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
        handleClearFile();
      }
    }

    if (newMessage.trim() || imageUrl) {
      const { error } = await supabase.from('messages').insert({
        forum_id: currentForumId,
        user_id: user.id,
        content: newMessage.trim(),
        image_url: imageUrl
      });
      if (error) console.error('Error sending message:', error);
      setNewMessage('');
    }
  };

  // ── Delete forum ──
  const handleDeleteForum = async () => {
    try {
      if (currentForum.thumbnail_url) {
        const path = currentForum.thumbnail_url.split('/forum-thumbnails/')[1];
        if (path) {
          await supabase.storage.from('forum-thumbnails').remove([decodeURIComponent(path)]);
        }
      }
      const { error } = await supabase.from('forums').delete().eq('id', currentForumId);
      if (error) throw error;
      setShowDeleteModal(false);
      navigate('/');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete forum: ' + err.message);
    }
  };

  // ── Typing indicator text ──
  const typingText = (() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return 'Multiple people are typing...';
  })();

  // ── File preview data ──
  const fileTypeInfo = getFileTypeInfo(pendingFile);
  const FileTypeIcon = fileTypeInfo.icon;
  const truncatedFileName = pendingFile?.name.length > 36
    ? pendingFile.name.slice(0, 33) + '...'
    : pendingFile?.name;

  return (
    <div className="chat-layout">
      {/* Left Sidebar */}
      <div className="chat-sidebar left-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/')}><ArrowLeft size={18} /></button>
          <h3>Forums</h3>
        </div>
        <div className="forum-list">
          {forums.map(f => (
            <div
              key={f.id}
              className={`forum-list-item ${f.id === currentForumId ? 'active' : ''}`}
              onClick={() => navigate(`/forum/${f.id}`)}
            >
              <Hash size={16} />
              <span>{f.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center - Chat Stream */}
      <div className="chat-main">
        <div className="chat-header">
          <Hash size={20} className="text-secondary" />
          <h2>{currentForum?.title || 'Select a forum'}</h2>
          {isOwner && (
            <button className="delete-forum-btn" onClick={() => setShowDeleteModal(true)} title="Delete this forum">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="chat-stream">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-item ${msg.user_id === user.id ? 'own-message' : ''}`}>
              <div className="message-avatar" style={{ backgroundImage: `url(${msg.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + (msg.profiles?.username || 'User')})` }}></div>
              <div className="message-content">
                <div className="message-meta">
                  <span className="message-username">{msg.profiles?.username || 'Unknown User'}</span>
                  <span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {msg.content && <div className="message-text">{msg.content}</div>}
                {msg.image_url && <img src={msg.image_url} alt="Uploaded attachment" className="message-image" />}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingText && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
            <span className="typing-text">{typingText}</span>
          </div>
        )}

        {/* ── File Preview Card (shown before send) ── */}
        {pendingFile && (
          <div className="file-preview-bar">
            <div className="file-preview-card">
              <div className="file-preview-icon" style={{ color: fileTypeInfo.color }}>
                <FileTypeIcon size={20} />
              </div>
              <div className="file-preview-info">
                <span className="file-preview-name">{truncatedFileName}</span>
                <span className="file-preview-type">{fileTypeInfo.label}</span>
              </div>
              <button
                type="button"
                className="file-preview-clear"
                onClick={handleClearFile}
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image"
          >
            <ImageIcon size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />
          <input
            type="text"
            placeholder={uploading ? 'Uploading...' : `Message #${currentForum?.title || 'forum'}`}
            className="chat-input"
            value={newMessage}
            onChange={handleInputChange}
            disabled={uploading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={(!newMessage.trim() && !pendingFile) || uploading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Right Sidebar */}
      <div className="chat-sidebar right-sidebar">
        <div className="sidebar-header">
          <Info size={18} />
          <h3>Details</h3>
        </div>
        {currentForum && (
          <div className="forum-details">
            <h4>About</h4>
            <p>{currentForum.description || 'No description provided.'}</p>
            <div className="detail-tags">
              {currentForum.tags && currentForum.tags.map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
            {isOwner && (
              <div className="owner-actions">
                <h4>Admin</h4>
                <button className="btn-danger-outline" onClick={() => setShowDeleteModal(true)}>
                  <Trash2 size={14} /> Delete Forum
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteForum}
        forumTitle={currentForum?.title}
      />
    </div>
  );
}
