/**
 * SortModal
 * Let users configure sorting preferences without committing until Apply.
 *  currentSort reflects external state; tempSort isolates edits until confirmed.
 */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
          <h2>Sort Options</h2>
        </div>

        <div className="sort-modal-content">
          <div className="sort-group">
            <label>Sort by:</label>
            <div className="sort-options">
              {/* Visual active state communicates the current choice */}
              <div 
                className={`sort-option ${tempSort.sortBy === 'date' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'date' }))}
              >
                Date
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'price' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'price' }))}
              >
                Price
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'client' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'client' }))}
              >
                Client Name
              </div>
              <div 
                className={`sort-option ${tempSort.sortBy === 'type' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortBy: 'type' }))}
              >
                Commission Type
              </div>
            </div>
          </div>

          <div className="sort-group">
            <label>Order:</label>
            <div className="sort-order-options">
              {/* Use human-friendly labels that adapt to the selected field */}
              <div 
                className={`sort-order-option ${tempSort.sortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortOrder: 'desc' }))}
              >
                {tempSort.sortBy === 'date' && 'Newest First'}
                {tempSort.sortBy === 'price' && 'Highest First'}
                {tempSort.sortBy === 'client' && 'Z to A'}
                {tempSort.sortBy === 'type' && 'Z to A'}
              </div>
              <div 
                className={`sort-order-option ${tempSort.sortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, sortOrder: 'asc' }))}
              >
                {tempSort.sortBy === 'date' && 'Oldest First'}
                {tempSort.sortBy === 'price' && 'Lowest First'}
                {tempSort.sortBy === 'client' && 'A to Z'}
                {tempSort.sortBy === 'type' && 'A to Z'}
              </div>
            </div>
          </div>

          <div className="sort-group">
            <label>Payment Status:</label>
            <div className="payment-filter-options">
              <div className="payment-status-info"><span className="payment-dot not-paid"></span><span>❌ Not Paid</span></div>
              <div className="payment-status-info"><span className="payment-dot half-paid"></span><span>⏳ Half Paid</span></div>
              <div className="payment-status-info"><span className="payment-dot fully-paid"></span><span>✅ Fully Paid</span></div>
            </div>
            
            <div className="payment-priority-toggle">
              <button
                className={`cf-btn cf-btn--secondary cf-btn--small ${tempSort.paymentPriority === 'unpaid-first' ? 'cf-btn--primary' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, paymentPriority: 'unpaid-first' }))}
              >
                Unpaid First
              </button>
              <button
                className={`cf-btn cf-btn--secondary cf-btn--small ${tempSort.paymentPriority === 'paid-first' ? 'cf-btn--primary' : ''}`}
                onClick={() => setTempSort(prev => ({ ...prev, paymentPriority: 'paid-first' }))}
              >
                Paid First
              </button>
            </div>
            
            <p className="payment-info-text">
              {tempSort.paymentPriority === 'unpaid-first' 
                ? 'Prioritizes unpaid commissions at the top' 
                : 'Prioritizes fully paid commissions at the top'}
            </p>
          </div>
        </div>

        <div className="sort-modal-actions">
          <button className="cf-btn cf-btn--secondary" onClick={handleCancel}>Cancel</button>
          <button className="cf-btn cf-btn--primary" onClick={handleApply}>Apply Sort</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SortModal;
