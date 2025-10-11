/**
 * EditCommissionModal
 * Edit existing pending commission details and references.
 *  commission prop is provided when isOpen is true; context updates persist changes.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useClients } from '../contexts/ClientContext';
import { useCommissions } from '../contexts/CommissionContext';
import type { CommissionRef, ClientInfo, PendingCommission } from '../contexts/CommissionContext';
import { SecurityValidator, ErrorHandler } from '../utils/validation';
import './CommissionModal.css';

interface EditCommissionModalProps {
  isOpen: boolean;
  commission: PendingCommission | null;
  onClose: () => void;
}

const EditCommissionModal: React.FC<EditCommissionModalProps> = ({ isOpen, commission, onClose }) => {
  const { clients } = useClients();
  const { updatePendingCommission } = useCommissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    commType: '',
    price: '',
    description: '',
  });

  const [references, setReferences] = useState<CommissionRef[]>([]);
  const [textRef, setTextRef] = useState('');

  // Sync UI state whenever a different commission is selected for editing
  useEffect(() => {
    if (commission) {
      setFormData({
        clientId: commission.client.id,
        commType: commission.commType,
        price: commission.price.toString(),
        description: commission.description || '',
      });
      setReferences([...commission.refs]);
    } else {
      setFormData({ clientId: '', commType: '', price: '', description: '' });
      setReferences([]);
    }
    setTextRef('');
  }, [commission]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Security validation pattern consistent with add commission modal
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!SecurityValidator.validateFileType(file)) {
        ErrorHandler.showUserError(`Invalid file type: ${file.name}. Only JPEG, PNG, GIF, and WebP images are allowed.`);
        ErrorHandler.logSecurityEvent('Invalid file type upload attempt', { fileName: file.name, fileType: file.type });
        return;
      }

      if (!SecurityValidator.validateFileSize(file, 25)) {
        ErrorHandler.showUserError(`File too large: ${file.name}. Maximum size is 25MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        if (!SecurityValidator.validateImageDataURL(imageUrl)) {
          ErrorHandler.showUserError(`Invalid image data: ${file.name}. The image may be corrupted or too large.`);
          ErrorHandler.logSecurityEvent('Invalid image data URL', { fileName: file.name });
          return;
        }
        const newRef: CommissionRef = { name: SecurityValidator.sanitizeText(file.name), url: imageUrl, type: 'image' };
        setReferences(prev => [...prev, newRef]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addTextReference = () => {
    if (textRef.trim()) {
      const newRef: CommissionRef = { name: textRef, type: 'text' };
      setReferences(prev => [...prev, newRef]);
      setTextRef('');
    }
  };

  const removeReference = (index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commission) return;

    // Form validation ensures data integrity before persistence
    if (!formData.clientId || !formData.commType || !formData.price || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }    const selectedClient = clients.find(c => c.id === formData.clientId);
    if (!selectedClient) {
      alert('Please select a valid client');
      return;
    }

    const clientInfo: ClientInfo = {
      id: selectedClient.id,
      name: selectedClient.name,
      contactInfo: selectedClient.contactInfo,
      pfp: selectedClient.pfp
    };

    updatePendingCommission(commission.id, {
      client: clientInfo,
      commType: formData.commType,
      price: parseFloat(formData.price),
      description: formData.description,
      refs: references,
    });

    onClose();
  };

  const handleCancel = () => { onClose(); };

  if (!isOpen || !commission) return null;

  return createPortal(
    <div className="commission-modal-overlay">
      <div className="commission-modal">
        <div className="commission-modal-header">
          <h2>Edit Commission</h2>
        </div>

        <form onSubmit={handleSubmit} className="commission-modal-form">
          <div className="form-group">
            <label htmlFor="clientId">Client *</label>
            <select id="clientId" name="clientId" value={formData.clientId} onChange={handleInputChange} required>
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.contactInfo})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="commType">Commission Type *</label>
            <input
              type="text"
              id="commType"
              name="commType"
              value={formData.commType}
              onChange={handleInputChange}
              placeholder="e.g., Character Design, Logo Design, Portrait..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional details about the commission..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>References</label>
            
            <div className="reference-upload">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
              />
              <button type="button" className="cf-btn cf-btn--secondary" onClick={() => fileInputRef.current?.click()}>
                Upload Images
              </button>
            </div>

            <div className="text-reference">
              <input
                type="text"
                value={textRef}
                onChange={(e) => setTextRef(e.target.value)}
                placeholder="Add text reference..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTextReference())}
              />
              <button type="button" className="cf-btn cf-btn--secondary" onClick={addTextReference}>
                Add Text
              </button>
            </div>

            {references.length > 0 && (
              <div className="references-list">
                <h4>References ({references.length}):</h4>
                {references.map((ref, index) => (
                  <div key={index} className="reference-item">
                    {ref.type === 'image' && ref.url ? (
                      <div className="reference-image">
                        <img src={ref.url} alt={ref.name} />
                        <span>{ref.name}</span>
                      </div>
                    ) : (
                      <div className="reference-text">
                        <span>{ref.name}</span>
                      </div>
                    )}
                    <button type="button" className="cf-btn cf-btn--danger cf-btn--small" onClick={() => removeReference(index)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="commission-modal-actions">
            <button type="button" className="cf-btn cf-btn--secondary" onClick={handleCancel}>Cancel</button>
            <button type="submit" className="cf-btn cf-btn--primary">Update Commission</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditCommissionModal;
