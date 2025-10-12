/**
 * SortModal
 * Let users configure sorting preferences without committing until Apply.
 *  currentSort reflects external state; tempSort isolates edits until confirmed.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './SortModal.css';

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSortChange: (sortOptions: SortOptions) => void;
  currentSort: SortOptions;
}

export interface SortOptions {
  sortBy: 'date' | 'price' | 'client' | 'type';
  sortOrder: 'asc' | 'desc';
  paymentPriority: 'unpaid-first' | 'paid-first';
}

const SortModal: React.FC<SortModalProps> = ({ isOpen, onClose, onSortChange, currentSort }) => {
  const { t } = useTranslation(['commissions', 'common']);
  const [tempSort, setTempSort] = useState<SortOptions>(currentSort);

  const handleApply = () => {
    onSortChange(tempSort);
    onClose();
  };

  const handleCancel = () => {
    setTempSort(currentSort);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="sort-modal-overlay">
      <div className="sort-modal">
        <div className="sort-modal-header">
          <h2>{t('sort.title')}</h2>
        </div>

        <div className="sort-modal-content">
          <div className="sort-group">
            <label>{t('sort.sortBy')}</label>
            <div className="sort-options">
              {/* Visual active state communicates the current choice */}
              <div 
                className={`sort-option ${tempSort.sortBy === 'date' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'date' }))}
              >
                {t('sort.fields.date')}
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'price' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'price' }))}
              >
                {t('sort.fields.price')}
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'client' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'client' }))}
              >
                {t('sort.fields.clientName')}
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'type' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'type' }))}
              >
                {t('sort.fields.commissionType')}
              </div>
            </div>
          </div>

          <div className="sort-group">
            <label>{t('sort.order')}</label>
            <div className="sort-order-options">
              {/* Use human-friendly labels that adapt to the selected field */}
              <div 
                className={`sort-order-option ${tempSort.sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortOrder: 'desc' }))}
              >
                {tempSort.sortBy === 'date' && t('sort.orderLabels.newestFirst')}
                {tempSort.sortBy === 'price' && t('sort.orderLabels.highestFirst')}
                {tempSort.sortBy === 'client' && t('sort.orderLabels.zToA')}
                {tempSort.sortBy === 'type' && t('sort.orderLabels.zToA')}
              </div>
              <div 
                className={`sort-order-option ${tempSort.sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortOrder: 'asc' }))}
              >
                {tempSort.sortBy === 'date' && t('sort.orderLabels.oldestFirst')}
                {tempSort.sortBy === 'price' && t('sort.orderLabels.lowestFirst')}
                {tempSort.sortBy === 'client' && t('sort.orderLabels.aToZ')}
                {tempSort.sortBy === 'type' && t('sort.orderLabels.aToZ')}
              </div>
            </div>
          </div>

          <div className="sort-group">
            <label>{t('sort.paymentStatus')}</label>
            <div className="payment-filter-options">
              <div className="payment-status-info"><span className="payment-dot not-paid"></span><span>{t('paymentStatus.notPaid')}</span></div>
              <div className="payment-status-info"><span className="payment-dot half-paid"></span><span>{t('paymentStatus.halfPaid')}</span></div>
              <div className="payment-status-info"><span className="payment-dot fully-paid"></span><span>{t('paymentStatus.fullyPaid')}</span></div>
            </div>
            
            <div className="payment-priority-toggle">
              <button
                className={`cf-btn cf-btn--secondary cf-btn--small ${tempSort.paymentPriority === 'unpaid-first' ? 'cf-btn--primary' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, paymentPriority: 'unpaid-first' }))}
              >
                {t('sort.paymentPriority.unpaidFirst')}
              </button>
              <button
                className={`cf-btn cf-btn--secondary cf-btn--small ${tempSort.paymentPriority === 'paid-first' ? 'cf-btn--primary' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, paymentPriority: 'paid-first' }))}
              >
                {t('sort.paymentPriority.paidFirst')}
              </button>
            </div>
            
            <p className="payment-info-text">
              {tempSort.paymentPriority === 'unpaid-first' 
                ? t('sort.paymentPriority.unpaidInfo') 
                : t('sort.paymentPriority.paidInfo')}
            </p>
          </div>
        </div>

        <div className="sort-modal-actions">
          <button className="cf-btn cf-btn--secondary" onClick={handleCancel}>{t('common:buttons.cancel')}</button>
          <button className="cf-btn cf-btn--primary" onClick={handleApply}>{t('sort.applySort')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SortModal;
