/**
 * ClientModal
 * Create or edit a client with validation and optional avatar upload.
 *  Parent controls isOpen; onSubmit/onUpdate persist data; SecurityValidator ensures sanitization.
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './ClientModal.css';
import type { Client } from '../contexts/ClientContext';
import { SecurityValidator } from '../utils/validation';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: Omit<Client, 'id' | 'totalCommissions' | 'joinDate' | 'lastCommission'>) => void;
  onUpdate?: (id: string, updates: Partial<Client>) => void;
  client?: Client | null; // edit mode prefill
  mode: 'add' | 'edit';
}

const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  client,
  mode
}) => {
  const { t } = useTranslation(['clients', 'common']);
  const [formData, setFormData] = useState({
    name: '',
    contactInfo: '',
    pfp: '',
    communicationPreference: 'Discord' as 'Discord' | 'Email' | 'X (Twitter)' | 'Bluesky' | 'Instagram',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When opening in edit mode, prefill; otherwise reset for a clean add flow
  useEffect(() => {
    if (mode === 'edit' && client) {
      setFormData({
        name: client.name,
        contactInfo: client.contactInfo,
        pfp: client.pfp || '',
        communicationPreference: client.communicationPreference,
        notes: client.notes
      });
    } else {
      setFormData({ name: '', contactInfo: '', pfp: '', communicationPreference: 'Discord', notes: '' });
    }
    setErrors({}); // Clear stale errors when reopening
  }, [mode, client, isOpen]);

  /** Validate and sanitize user input. Focus on data safety and UX-friendly messages. */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Required business information for client relationship management
    if (!formData.name?.trim()) errors.name = 'Name is required';
    
    // Contact method essential for project communication
    if (!formData.contactInfo?.trim()) errors.contactInfo = 'Contact info is required';
    
    if (formData.pfp) {
      // Profile image security validation for data URLs from file uploads
      if (formData.pfp.includes('data:')) {
        if (!SecurityValidator.validateImageDataURL(formData.pfp)) {
          errors.pfp = 'Invalid image data';
        }
      }
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // Data sanitization prevents XSS attacks before persistence
    const sanitizedData = {
      name: SecurityValidator.sanitizeText(formData.name),
      contactInfo: SecurityValidator.sanitizeText(formData.contactInfo),
      pfp: formData.pfp || undefined,
      communicationPreference: formData.communicationPreference,
      notes: SecurityValidator.sanitizeText(formData.notes)
    };

    if (mode === 'edit' && client && onUpdate) onUpdate(client.id, sanitizedData);
    else onSubmit(sanitizedData);

    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' })); // Clear field error on edit
  };

  // Convert selected image file to base64 for local persistence without filesystem access
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, pfp: 'Please select a valid image file' }));
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, pfp: 'Image size should be less than 25MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({ ...prev, pfp: base64 }));
        setErrors(prev => ({ ...prev, pfp: '' }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal" onClick={(e) => e.stopPropagation()}>
        <div className="client-modal-header">
          <h2>{mode === 'edit' ? t('clients:editClient') : t('clients:addClient')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="client-modal-form">
          {/* Profile Picture Section */}
          <div className="form-group profile-picture-section">
            <label>{t('clients:fields.profilePicture')}</label>
            <div className="profile-picture-container">
              <div 
                className="profile-picture-preview" 
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
              >
                {formData.pfp ? (
                  <img 
                    src={formData.pfp} 
                    alt="Profile preview" 
                    className="profile-preview-image"
                  />
                ) : (
                  <div className="profile-placeholder">
                    <span>{t('clients:uploadPhoto')}</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
            {errors.pfp && <span className="error-message">{errors.pfp}</span>}
          </div>

          {/* Client Information */}
          <div className="form-group">
            <label htmlFor="name">{t('clients:fields.name')} {t('clients:required')}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder={t('common:placeholders.enterClientName')}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Communication Settings */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="communicationPreference">{t('clients:fields.communicationPreference')} {t('clients:required')}</label>
              <select
                id="communicationPreference"
                name="communicationPreference"
                value={formData.communicationPreference}
                onChange={handleInputChange}
              >
                <option value="Discord">{t('clients:communicationMethods.discord')}</option>
                <option value="Email">{t('clients:communicationMethods.email')}</option>
                <option value="X (Twitter)">{t('clients:communicationMethods.twitter')}</option>
                <option value="Bluesky">{t('clients:communicationMethods.bluesky')}</option>
                <option value="Instagram">{t('clients:communicationMethods.instagram')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contactInfo">
                {formData.communicationPreference === 'Discord' && t('clients:contactLabels.discord')}
                {formData.communicationPreference === 'Email' && t('clients:contactLabels.email')}
                {formData.communicationPreference === 'X (Twitter)' && t('clients:contactLabels.twitter')}
                {formData.communicationPreference === 'Bluesky' && t('clients:contactLabels.bluesky')}
                {formData.communicationPreference === 'Instagram' && t('clients:contactLabels.instagram')}
              </label>
              <input
                type="text"
                id="contactInfo"
                name="contactInfo"
                value={formData.contactInfo}
                onChange={handleInputChange}
                className={errors.contactInfo ? 'error' : ''}
                placeholder={
                  formData.communicationPreference === 'Discord' ? 'username' :
                  formData.communicationPreference === 'Email' ? 'client@example.com' :
                  formData.communicationPreference === 'X (Twitter)' ? '@username' :
                  formData.communicationPreference === 'Bluesky' ? '@username.bsky.social' :
                  formData.communicationPreference === 'Instagram' ? '@username' :
                  t('common:placeholders.enterContactInfo')
                }
              />
              {errors.contactInfo && <span className="error-message">{errors.contactInfo}</span>}
            </div>
          </div>

          {/* Notes Section */}
          <div className="form-group">
            <label htmlFor="notes">{t('clients:fields.notes')}</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder={t('common:placeholders.addNotes')}
              rows={4}
            />
          </div>

          <div className="client-modal-actions cf-btn-group">
            <button type="button" onClick={onClose} className="cf-btn cf-btn--secondary">
              {t('common:buttons.cancel')}
            </button>
            <button type="submit" className="cf-btn cf-btn--primary">
              {mode === 'edit' ? t('common:buttons.updateClient') : t('common:buttons.addClient')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ClientModal;
