/**
 * PendingCommCard
 * Summarizes a pending commission with expandable details and actions.
 *  Parent manages expansion; actions use confirmations to prevent accidental changes.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useCommissions } from '../contexts/CommissionContext';
import type { PendingCommission } from '../contexts/CommissionContext';
import ImageViewer from './ImageViewer';
import './PendingCommCard.css';

// Legacy type alias for backward compatibility
export type PendingComm = PendingCommission;

interface PendingCommCardProps {
  comm: PendingCommission;
  isExpanded: boolean;
  onToggle: () => void;
  onEditCommission?: (commission: PendingCommission) => void;
}

const PendingCommCard: React.FC<PendingCommCardProps> = ({ comm, isExpanded, onToggle, onEditCommission }) => {
  const { t } = useTranslation(['commissions', 'common']);
  const { settings } = useSettings();
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(-1);
  const { 
    markCommissionComplete, 
    markCommissionInProgress, 
    updatePaymentStatus, 
    deletePendingCommission,
    togglePin
  } = useCommissions();

  /**
   * Filter and prepare image references for gallery viewing.
   * Excludes text references and broken URLs to prevent viewer errors.
   */
  const imageRefs = comm.refs.filter(ref => ref.type === 'image' && ref.url);
  const images = imageRefs.map(ref => ({ url: ref.url!, name: ref.name }));

  const handleMarkComplete = () => {
    if (window.confirm(t('commissions:markComplete', { clientName: comm.client.name }))) {
      markCommissionComplete(comm.id);
    }
  };

  const handleMarkInProgress = () => { markCommissionInProgress(comm.id); };

  const handleTogglePin = () => { togglePin(comm.id); };

  const handlePaymentStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as 'not-paid' | 'half-paid' | 'fully-paid';
    updatePaymentStatus(comm.id, newStatus);
  };

  const handleCancelCommission = () => {
    if (window.confirm(t('commissions:cancelCommission', { clientName: comm.client.name }))) {
      deletePendingCommission(comm.id);
    }
  };

  return (
    <div className={`pending-comm-card ${isExpanded ? 'expanded' : 'collapsed'} ${settings.animations ? 'animated' : ''} ${comm.isPinned ? 'pinned' : ''}`}>
      {/* Header: clicking toggles expansion; prevent nested controls from bubbling */}
      <div 
        className={`pending-comm-header ${isExpanded ? 'expanded-header' : ''}`}
        onClick={onToggle}
      >
        <div className="pending-comm-client">
          <div className="pending-comm-avatar">
            {comm.client.pfp ? (
              <img src={comm.client.pfp} alt={`${comm.client.name} profile`} className="client-pfp" />
            ) : (
              <div className="client-pfp-placeholder">
                {comm.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            )}
          </div>
          <div className="pending-comm-info">
            <span className="pending-comm-client-name">{comm.client.name}</span>
            <span className="pending-comm-client-contact">{comm.client.contactInfo}</span>
            <span className="pending-comm-type">{comm.commType}</span>
          </div>
        </div>
        <div className="pending-comm-meta">
          <span className="pending-comm-price">${comm.price}</span>
          <span className={`pending-comm-status pending-comm-status--${comm.status.toLowerCase().replace(/\s/g, '-')}`}>
            {comm.status}
          </span>
          <span className="pending-comm-date">{comm.date}</span>
          {/* Stop propagation so selecting payment status doesn't toggle card */}
          <div className="pending-comm-payment">
            <label className="payment-selector" onClick={(e) => e.stopPropagation()}>
              <select
                id={`paymentStatus-${comm.id}`}
                value={comm.paymentStatus}
                onChange={handlePaymentStatusChange}
                onClick={(e) => e.stopPropagation()}
                className="payment-select"
              >
                <option value="not-paid">{t('commissions:paymentStatus.notPaid')}</option>
                <option value="half-paid">{t('commissions:paymentStatus.halfPaid')}</option>
                <option value="fully-paid">{t('commissions:paymentStatus.fullyPaid')}</option>
              </select>
            </label>
          </div>
          <button
            className={`pending-comm-pin-btn ${comm.isPinned ? 'pinned' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
            aria-label={comm.isPinned ? 'Unpin commission' : 'Pin commission'}
            title={comm.isPinned ? 'Unpin commission' : 'Pin commission'}
          >
            📌
          </button>
        </div>
      </div>

      {/* Keep details mounted to avoid re-render jank with CSS expand animation */}
      <div className="pending-comm-details">
        <div>
          <div className="pending-comm-description">
            <h4>{t('common:labels.description')}</h4>
            <p>{comm.description}</p>
          </div>

          <div className="pending-comm-refs">
            <h4>{t('common:labels.references')}</h4>
            <div className="pending-comm-refs-list">
              {comm.refs
                .filter(ref => ref.type === 'image' && ref.url)
                .map((ref, idx) => (
                  <div key={idx} className="pending-comm-ref">
                    <img 
                      src={ref.url} 
                      alt={ref.name} 
                      title={ref.name}
                      className="clickable-image"
                      onClick={() => {
                        const imageIndex = imageRefs.findIndex(imgRef => imgRef.url === ref.url);
                        setViewingImageIndex(imageIndex);
                      }}
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="pending-comm-actions cf-btn-group">
            <button 
              className={`cf-btn cf-btn--success ${comm.status === 'Pending' ? 'cf-btn--disabled' : ''}`}
              onClick={handleMarkComplete}
              disabled={comm.status === 'Pending'}
              title={comm.status === 'Pending' ? t('commissions:tooltips.markInProgressFirst') : t('commissions:tooltips.markComplete')}
            >
              {t('commissions:actions.markComplete')}
            </button>
            <button 
              className={`cf-btn cf-btn--warning ${comm.status === 'In Progress' ? 'cf-btn--disabled' : ''}`}
              onClick={handleMarkInProgress}
              disabled={comm.status === 'In Progress'}
              title={comm.status === 'In Progress' ? t('commissions:tooltips.alreadyInProgress') : t('commissions:tooltips.markInProgress')}
            >
              {comm.status === 'In Progress' ? t('commissions:status.inProgress') : t('commissions:actions.markInProgress')}
            </button>
            <button className="cf-btn cf-btn--secondary" onClick={() => onEditCommission?.(comm)}>
              {t('commissions:actions.editDetails')}
            </button>
            <button className="cf-btn cf-btn--danger" onClick={handleCancelCommission}>
              {t('commissions:actions.cancelCommission')}
            </button>
          </div>
        </div>
      </div>
      
      {viewingImageIndex >= 0 && images.length > 0 && (
        <ImageViewer
          isOpen={true}
          images={images}
          currentIndex={viewingImageIndex}
          onClose={() => setViewingImageIndex(-1)}
          onIndexChange={setViewingImageIndex}
        />
      )}
    </div>
  );
};

export default PendingCommCard;