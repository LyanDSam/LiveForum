import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { loadImage, cropAndCompressImage } from '../utils/imageCropper';
import { X, Upload, Loader2, Plus, Move } from 'lucide-react';
import './CreateForumModal.css';

export default function CreateForumModal({ isOpen, onClose, user, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cropping states
  const [tempImageSrc, setTempImageSrc] = useState(null); // original uploaded image dataURL
  const [thumbnailFile, setThumbnailFile] = useState(null); // final cropped and compressed File
  const [thumbnailPreview, setThumbnailPreview] = useState(null); // preview of the cropped image
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const fileRef = useRef(null);
  const tagInputWrapperRef = useRef(null);

  // Fetch tags from database on open
  useEffect(() => {
    if (isOpen) {
      fetchTags();
    } else {
      resetForm();
    }
  }, [isOpen]);

  // Click outside listener for tag suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagInputWrapperRef.current && !tagInputWrapperRef.current.contains(event.target)) {
        setShowTagSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('name').order('name', { ascending: true });
    if (data) {
      setAvailableTags(data.map(t => t.name));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setTempImageSrc(reader.result);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setTagInput('');
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setTempImageSrc(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Drag handlers for the image cropping viewport
  const handleStartDrag = (e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  const handleDrag = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y
    });
  };

  const handleEndDrag = () => {
    setIsDragging(false);
  };

  // Confirm crop
  const handleConfirmCrop = async () => {
    if (!tempImageSrc || !containerRef.current) return;
    try {
      const img = await loadImage(tempImageSrc);
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      const croppedFile = await cropAndCompressImage(img, {
        zoom,
        x: position.x,
        y: position.y,
        containerWidth,
        containerHeight
      });

      setThumbnailFile(croppedFile);
      setThumbnailPreview(URL.createObjectURL(croppedFile));
      setTempImageSrc(null); // return to main form
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Failed to crop image. Please try again.');
    }
  };

  // Cancel crop
  const handleCancelCrop = () => {
    setTempImageSrc(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Add tag to selections
  const addTag = (tag) => {
    const formattedTag = tag.trim();
    if (!formattedTag) return;
    if (!selectedTags.includes(formattedTag)) {
      setSelectedTags([...selectedTags, formattedTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  // Remove tag from selections
  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(t => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        addTag(tagInput);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    let thumbnailUrl = null;

    try {
      // 1. Upload cropped & compressed thumbnail if provided
      if (thumbnailFile) {
        const fileName = `${user.id}/${Date.now()}_cropped_thumbnail.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('forum-thumbnails')
          .upload(fileName, thumbnailFile);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('forum-thumbnails')
          .getPublicUrl(fileName);
        thumbnailUrl = urlData.publicUrl;
      }

      // 2. Insert forum record
      const { data: forumData, error: insertErr } = await supabase
        .from('forums')
        .insert({
          title: title.trim(),
          description: description.trim(),
          tags: selectedTags,
          thumbnail_url: thumbnailUrl,
          created_by: user.id,
          member_count: 1,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 3. Associate tags using the RPC database transaction
      if (selectedTags.length > 0 && forumData?.id) {
        const { error: rpcErr } = await supabase.rpc('associate_tags_to_forum', {
          p_forum_id: forumData.id,
          p_tag_names: selectedTags
        });
        if (rpcErr) console.error('Error linking tags via RPC:', rpcErr);
      }

      resetForm();
      onCreated?.();
      onClose();
    } catch (err) {
      console.error('Error creating forum:', err);
      alert('Failed to create forum: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tag suggestions based on user input (excluding already selected ones)
  const suggestions = availableTags.filter(
    tag =>
      tag.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTags.includes(tag)
  );

  const exactMatchExists = availableTags.some(
    tag => tag.toLowerCase() === tagInput.toLowerCase()
  ) || selectedTags.some(
    tag => tag.toLowerCase() === tagInput.toLowerCase()
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-forum-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Render Cropping UI View if an image was selected but not yet cropped */}
        {tempImageSrc ? (
          <div className="cropper-view">
            <div className="cfm-header">
              <h2>Crop Thumbnail (16:9)</h2>
              <button className="close-btn" onClick={handleCancelCrop}><X size={20} /></button>
            </div>
            
            <p className="cropper-instructions">
              Drag to position the image and use the slider below to zoom.
            </p>

            <div 
              ref={containerRef}
              className="cropper-container"
              onMouseDown={handleStartDrag}
              onMouseMove={handleDrag}
              onMouseUp={handleEndDrag}
              onMouseLeave={handleEndDrag}
              onTouchStart={handleStartDrag}
              onTouchMove={handleDrag}
              onTouchEnd={handleEndDrag}
            >
              {/* Crop guide lines (Rule of Thirds) */}
              <div className="crop-grid-line h1"></div>
              <div className="crop-grid-line h2"></div>
              <div className="crop-grid-line v1"></div>
              <div className="crop-grid-line v2"></div>

              <img 
                src={tempImageSrc} 
                alt="To Crop" 
                className="cropper-image"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                draggable={false}
              />
              
              <div className="drag-indicator">
                <Move size={18} />
              </div>
            </div>

            <div className="cropper-controls">
              <div className="zoom-control">
                <label>Zoom</label>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
              </div>

              <div className="cropper-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelCrop}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={handleConfirmCrop}>
                  Save Crop
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Forum Creation Form View */
          <>
            <div className="cfm-header">
              <h2>Create a Forum</h2>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="cfm-form">
              <div className="cfm-field">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Give your forum a name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
                />
              </div>

              <div className="cfm-field">
                <label>Description</label>
                <textarea
                  placeholder="What is this forum about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Dynamic multi-select tag input */}
              <div className="cfm-field" ref={tagInputWrapperRef}>
                <label>Tags (Select existing or create custom)</label>
                
                {/* Selected tokens display */}
                <div className="cfm-selected-tags">
                  {selectedTags.map(tag => (
                    <span key={tag} className="cfm-tag-token">
                      #{tag}
                      <button type="button" className="cfm-remove-tag" onClick={() => removeTag(tag)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input field */}
                <div className="cfm-tag-input-container">
                  <input
                    type="text"
                    placeholder={selectedTags.length === 0 ? "Type to search or add tags..." : "Add more tags..."}
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onKeyDown={handleTagInputKeyDown}
                    onFocus={() => setShowTagSuggestions(true)}
                    className="cfm-tag-input"
                  />
                  
                  {/* Dropdown Suggestions */}
                  {showTagSuggestions && (tagInput.trim() !== '' || suggestions.length > 0) && (
                    <div className="cfm-suggestions-dropdown">
                      {suggestions.map(tag => (
                        <div
                          key={tag}
                          className="cfm-suggestion-item"
                          onClick={() => addTag(tag)}
                        >
                          #{tag}
                        </div>
                      ))}
                      {tagInput.trim() !== '' && !exactMatchExists && (
                        <div
                          className="cfm-suggestion-item cfm-create-custom-option"
                          onClick={() => addTag(tagInput)}
                        >
                          <Plus size={12} /> Create custom tag "{tagInput}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="cfm-field">
                <label>Thumbnail (16:9 ratio)</label>
                <div
                  className="cfm-thumbnail-upload"
                  onClick={() => fileRef.current?.click()}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" className="cfm-thumb-preview" />
                  ) : (
                    <div className="cfm-upload-placeholder">
                      <Upload size={24} />
                      <span>Click to upload thumbnail</span>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>
                {thumbnailPreview && (
                  <button 
                    type="button" 
                    className="cfm-reselect-thumb-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    Change Image
                  </button>
                )}
              </div>

              <button type="submit" className="btn-primary cfm-submit" disabled={submitting || !title.trim()}>
                {submitting ? <><Loader2 size={16} className="spin-icon" /> Creating...</> : 'Create Forum'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
