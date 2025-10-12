/**
 * ClientCard
 * Presents a compact summary of a client with an optional expandable details section.
 * Parent controls expanded state via props; animations are toggled via settings.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import './ClientCard.css';
import ArrowDown from '../assets/icons/arrow-down-s-line.svg?react';
import type { Client } from '../contexts/ClientContext';

/**
 * Props for ClientCard
 * - onToggle is used instead of internal state to keep a single source of truth in the list.
 */
interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onDelete, isExpanded, onToggle }) => {
  const { t } = useTranslation('clients');
  const { settings } = useSettings();

  // Keep toggle logic simple and predictable; parent decides which card is open
  const toggleExpanded = () => {
    onToggle();
  };

  /**
   * Derive initials to provide a stable avatar placeholder when no pfp is present.
   * Assumption: Name is space-separated and non-empty.
   */
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={`client-card ${isExpanded ? 'expanded' : ''} ${settings.animations ? 'animated' : ''}`}>
      <div 
        className={`client-header ${isExpanded ? 'expanded-header' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="client-info">
          <div className="client-avatar">
            {client.pfp ? (
              <img src={client.pfp} alt={`${client.name} profile`} className="client-pfp" />
            ) : (
              <div className="client-pfp-placeholder">
                {getInitials(client.name)}
              </div>
            )}
          </div>
          <div className="client-details">
            <div className="client-name">{client.name}</div>
            <div className="client-contact">{client.contactInfo}</div>
          </div>
        </div>
        
        <div className="client-meta">
          <div className="client-commissions">{client.totalCommissions} commissions</div>
        </div>
        
        {/* Stop header click from toggling twice when the button is pressed */}
        <button 
          className={`client-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          aria-label={isExpanded ? 'Collapse client details' : 'Expand client details'}
        >
          <ArrowDown />
        </button>
      </div>

      {/* Mount once and show/hide with CSS to avoid remount jank during animations */}
      <div className="client-expanded-details">
        <div>
          <div className="client-section">
            <h4>{t('clientCard.information')}</h4>
            <div className="client-info-grid">
              <div className="info-item">
                <span className="info-label">{t('clientCard.joinDate')}</span>
                <span className="info-value">{new Date(client.joinDate).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('clientCard.lastCommission')}</span>
                <span className="info-value">
                  {client.lastCommission ? new Date(client.lastCommission).toLocaleDateString() : t('clientCard.noCommissionsYet')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">{t('clientCard.communication')}</span>
                <span className="info-value">{client.communicationPreference}</span>
              </div>
            </div>
          </div>

          {client.notes && (
            <div className="client-section">
              <h4>Notes</h4>
              <p className="client-notes">{client.notes}</p>
            </div>
          )}

          <div className="client-actions cf-btn-group">
            <button 
              className="cf-btn cf-btn--danger"
              onClick={() => {
                                // Confirm destructive actions to prevent accidental data loss
                if (window.confirm(t('clientCard.deleteConfirm', { clientName: client.name }))) {
                  onDelete(client.id);
                }
              }}
            >
              {t('clientCard.removeButton')}
            </button>
            <button 
              className="cf-btn cf-btn--primary"
              onClick={() => onEdit(client)}
            >
              {t('clientCard.editButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
