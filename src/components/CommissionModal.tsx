/**
 * CommissionModal
 * Add a new p  // Support multiple image uploads with security checks; store as data URLs for portability
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {ding commission with basic validation and optional references.
 *  Parent controls visibility; contexts handle persistence and state updates.
 */
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useClients } from '../contexts/ClientContext';
import { useCommissions } from '../contexts/CommissionContext';
import type { CommissionRef, ClientInfo } from '../contexts/CommissionContext';
import { SecurityValidator, ErrorHandler } from '../utils/validation';
import './CommissionModal.css';

interface CommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommissionModal: React.FC<CommissionModalProps> = ({ isOpen, onClose }) => {
  const { clients } = useClients();
  const { addPendingCommission } = useCommissions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    commType: '',
    price: '',
    description: '',
  });

  const [references, setReferences] = useState<CommissionRef[]>([]);
  const [textRef, setTextRef] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Support multiple image uploads with security checks; store as data URLs for portability
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!SecurityValidator.validateFileType(file)) {
        ErrorHandler.showUserError(`Invalid file type: ${file.name}. Only JPEG, PNG, GIF, and WebP images are allowed.`);
        ErrorHandler.logSecurityEvent('Invalid file type upload attempt', { fileName: file.name, fileType: file.type });
        return;
      }

      if (!SecurityValidator.validateFileSize(file, 5)) {
        ErrorHandler.showUserError(`File too large: ${file.name}. Maximum size is 5MB.`);
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

    // Reset input field to allow re-uploading the same filename if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addTextReference = () => {
    if (textRef.trim()) {
      const newRef: CommissionRef = { name: textRef.trim(), type: 'text' };
      setReferences(prev => [...prev, newRef]);
      setTextRef('');
    }
  };

  const removeReference = (index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation ensures required data is present before processing
    if (!formData.clientId || !formData.commType || !formData.price || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    const priceValidation = SecurityValidator.validatePrice(formData.price);
    if (!priceValidation.isValid) {
      ErrorHandler.showUserError(priceValidation.error || 'Invalid price');
      return;
    }

    const sanitizedCommType = SecurityValidator.sanitizeText(formData.commType);
    if (sanitizedCommType.length < 3) {
      ErrorHandler.showUserError('Commission type must be at least 3 characters long');
      return;
    }

    const selectedClient = clients.find(c => c.id === formData.clientId);
    if (!selectedClient) {
      ErrorHandler.showUserError('Please select a valid client');
      return;
    }

    const sanitizedDescription = SecurityValidator.sanitizeText(formData.description);

    const clientInfo: ClientInfo = {
      id: selectedClient.id,
      name: selectedClient.name,
      contactInfo: selectedClient.contactInfo,
      pfp: selectedClient.pfp
    };

    addPendingCommission({
      client: clientInfo,
      commType: sanitizedCommType,
      price: priceValidation.value!,
      description: sanitizedDescription,
      refs: references,
      status: 'Pending',
      paymentStatus: 'not-paid',
    });

    // Clear form state to prepare for next commission entry
    setFormData({ clientId: '', commType: '', price: '', description: '' });
    setReferences([]);
    setTextRef('');
    onClose();
  };

  const handleCancel = () => {
    setFormData({ clientId: '', commType: '', price: '', description: '' });
    setReferences([]);
    setTextRef('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="commission-modal-overlay">
      <div className="commission-modal">
        <div className="commission-modal-header">
          <h2>Add Commission</h2>
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
            <button type="submit" className="cf-btn cf-btn--primary">Add Commission</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CommissionModal;
