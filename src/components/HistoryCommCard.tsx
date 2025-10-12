/**
 * Archive display for completed commission projects.
 * Provides post-completion management: payment tracking, reactivation options, and historical reference.
 * Essential for freelancers to maintain accurate financial records and project history.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';
import { useCommissions } from '../contexts/CommissionContext';
import type { HistoryCommission } from '../contexts/CommissionContext';
import ImageViewer from './ImageViewer';
import './HistoryCommCard.css';
import ArrowDown from '../assets/icons/arrow-down-s-line.svg?react';

/**
 * Legacy type alias preserved for backwards compatibility.
 * Prevents breaking changes in external components that might reference this type.
 */
export type HistoryComm = HistoryCommission;

interface HistoryCommCardProps {
  comm: HistoryCommission;
  isExpanded: boolean;
  onToggle: () => void;
}

const HistoryCommCard: React.FC<HistoryCommCardProps> = ({ comm, isExpanded, onToggle }) => {
  const { t } = useTranslation(['commissions', 'common']);
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(-1);
  const { settings } = useSettings();
  const { markCommissionIncomplete, deleteHistoryCommission, updateHistoryPaymentStatus } = useCommissions();

  /**
   * Prepare image gallery data for full-screen viewing experience.
   * Filters out text references and broken URLs to prevent gallery errors.
   */
  const imageRefs = comm.refs.filter(ref => ref.type === 'image' && ref.url);
  const images = imageRefs.map(ref => ({ url: ref.url!, name: ref.name }));

  const toggleExpanded = () => { onToggle(); };

  /**
   * Reactivation workflow for when completed projects need additional work.
   * Common scenario: client requests revisions after initial completion.
   */
  const handleMarkIncomplete = () => {
    if (window.confirm(t('commissions:history.markIncomplete'))) {
      markCommissionIncomplete(comm.id);
    }
  };

  /**
   * Permanent deletion with confirmation to prevent accidental data loss.
   * Historical records are valuable for business analytics and tax purposes.
   */
  const handleDelete = () => {
    if (window.confirm(t('commissions:history.deleteConfirm', { clientName: comm.client.name }))) {
      deleteHistoryCommission(comm.id);
    }
  };

  /**
   * Progressive payment tracking for cash flow management.
   * Freelancers often receive partial payments before project completion.
   */
  const handleMarkPaid = () => {
    const nextStatus = comm.paymentStatus === 'not-paid' ? 'half-paid' : 'fully-paid';
    const statusText = nextStatus === 'half-paid' ? t('commissions:history.halfPaid') : t('commissions:history.fullyPaid');
    
    if (window.confirm(t('commissions:history.markPaidConfirm', { status: statusText }))) {
      updateHistoryPaymentStatus(comm.id, nextStatus);
    }
  };

  return (
    <div className={`history-comm-card ${isExpanded ? 'expanded' : 'collapsed'} ${settings.animations ? 'animated' : ''}`}>
      {/* Header click area provides intuitive expand/collapse without cluttering UI with extra buttons */}
      <div 
        className={`history-comm-header ${isExpanded ? 'expanded-header' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="history-comm-client">
          <div className="history-comm-avatar">
            {comm.client.pfp ? (
              <img src={comm.client.pfp} alt={`${comm.client.name} profile`} className="client-pfp" />
            ) : (
              <div className="client-pfp-placeholder">
                {comm.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            )}
          </div>
          <div className="history-comm-info">
            <span className="history-comm-client-name">{comm.client.name}</span>
            <span className="history-comm-client-contact">{comm.client.contactInfo}</span>
            <span className="history-comm-type">{comm.commType}</span>
          </div>
        </div>
        <div className="history-comm-meta">
          <span className="history-comm-price">${comm.price}</span>
          <span className={`history-comm-status history-comm-status--${comm.status.toLowerCase()}`}>
            {comm.status}
          </span>
          <span className={`history-comm-payment payment-status--${comm.paymentStatus}`}>
            {comm.paymentStatus === 'not-paid' ? t('commissions:paymentStatus.notPaid') : 
             comm.paymentStatus === 'half-paid' ? t('commissions:paymentStatus.halfPaid') : t('commissions:paymentStatus.fullyPaid')}
          </span>
          <span className="history-comm-date">{new Date(comm.completedDate).toLocaleDateString()}</span>
        </div>
        <button
          className={`history-comm-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
          aria-label={isExpanded ? 'Collapse commission details' : 'Expand commission details'}
        >
          <ArrowDown />
        </button>
      </div>

      {/* Persistent DOM mounting enables smooth CSS grid height animations without layout jumps */}
      <div className="history-comm-details">
        <div>
          <div className="history-comm-section">
            <h4>{t('commissions:history.commissionDetails')}</h4>
            <p className="history-comm-description">{comm.description}</p>
            
            <div className="history-comm-timeline">
              <div className="timeline-item">
                <span className="timeline-label">{t('commissions:history.started')}</span>
                <span className="timeline-date">{new Date(comm.originalDate).toLocaleDateString()}</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-label">{t('commissions:history.completed')}</span>
                <span className="timeline-date">{new Date(comm.completedDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          {comm.refs && comm.refs.filter(ref => ref.type === 'image').length > 0 && (
            <div className="history-comm-section">
              <h4>{t('commissions:history.referencesUsed')}</h4>
              <div className="history-comm-refs">
                {comm.refs
                  .filter(ref => ref.type === 'image')
                  .map((ref, index) => (
                    <div key={index} className="history-comm-ref">
                      <div className="ref-image-container">
                        <img 
                          src={ref.url || 'https://via.placeholder.com/100x100/00acc1/ffffff?text=IMG'} 
                          alt={ref.name}
                          className="ref-image clickable-image"
                          loading="lazy"
                          onClick={() => {
                            if (ref.url) {
                              const imageIndex = imageRefs.findIndex(imgRef => imgRef.url === ref.url);
                              setViewingImageIndex(imageIndex);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Confirmation dialogs prevent accidental destructive actions that could lose business data */}
          <div className="history-comm-actions cf-btn-group">
            {comm.paymentStatus !== 'fully-paid' && (
              <button 
                className="cf-btn cf-btn--success"
                onClick={handleMarkPaid}
              >
                {comm.paymentStatus === 'not-paid' ? t('commissions:history.markHalfPaidBtn') : t('commissions:history.markFullyPaidBtn')}
              </button>
            )}
            <button 
              className="cf-btn cf-btn--warning"
              onClick={handleMarkIncomplete}
            >
              {t('commissions:history.markIncompleteBtn')}
            </button>
            <button 
              className="cf-btn cf-btn--danger"
              onClick={handleDelete}
            >
              {t('commissions:history.deleteBtn')}
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

export default HistoryCommCard;