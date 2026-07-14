import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import './DeleteConfirmModal.css';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, forumTitle }) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dcm-icon">
          <AlertTriangle size={32} />
        </div>
        <h3>Delete Forum</h3>
        <p>
          Are you sure you want to delete <strong>"{forumTitle}"</strong>? 
          All messages and data will be permanently removed. This action cannot be undone.
        </p>
        <div className="dcm-actions">
          <button className="btn-secondary" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="btn-danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? <><Loader2 size={14} className="spin-icon" /> Deleting...</> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
