/**
 * PendingCommList
 * Renders pending commissions with sorting and controlled expansion.
 *  Data provided by context; small list sorting done client-side.
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PendingCommCard from './PendingCommCard';
import { useCommissions } from '../contexts/CommissionContext';
import type { PendingCommission } from '../contexts/CommissionContext';
import type { SortOptions } from './SortModal';
import './PendingCommList.css';

interface PendingCommListProps {
  onEditCommission?: (commission: PendingCommission) => void;
  sortOptions?: SortOptions;
}

const PendingCommList: React.FC<PendingCommListProps> = ({ 
  onEditCommission, 
  sortOptions = { sortBy: 'date', sortOrder: 'desc', paymentPriority: 'unpaid-first' }
}) => {
  const { t } = useTranslation('commissions');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { pendingCommissions, isLoading } = useCommissions();

    // Primary sort by chosen field, secondary by payment status for prioritization
  const sortedPending = useMemo(() => {
    let sorted = [...pendingCommissions];

    sorted.sort((a, b) => {
      // Pinned commissions always go first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      let comparison = 0;
      
      switch (sortOptions.sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'client':
          comparison = a.client.name.localeCompare(b.client.name);
          break;
        case 'type':
          comparison = a.commType.localeCompare(b.commType);
          break;
        default:
          comparison = 0;
      }
      
      return sortOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    sorted.sort((a, b) => {
      // Pinned commissions always go first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const paymentPriority = { 'not-paid': 0, 'half-paid': 1, 'fully-paid': 2 };
      const aPriority = paymentPriority[a.paymentStatus] || 0;
      const bPriority = paymentPriority[b.paymentStatus] || 0;
      
      return sortOptions.paymentPriority === 'unpaid-first' ? aPriority - bPriority : bPriority - aPriority;
    });

    return sorted;
  }, [pendingCommissions, sortOptions]);

  const handleToggle = (id: string) => { setExpandedId(expandedId === id ? null : id); };

  // Loading: communicate state inside scroll container for layout stability
  if (isLoading) {
    return (
      <div className="pending-comm-container">
        <div className="pending-comm-list">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty: provide helpful guidance
  if (sortedPending.length === 0) {
    return (
      <div className="pending-comm-container">
        <div className="pending-comm-list">
          <div className="pending-comm-empty">
            <div className="pending-comm-empty-icon">📋</div>
            <div className="pending-comm-empty-text">{t('empty.noPending')}</div>
            <div className="pending-comm-empty-subtext">{t('empty.pendingSubtext')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pending-comm-container">
      <div className="pending-comm-list">
        {sortedPending.map((comm: PendingCommission) => (
          <PendingCommCard
            key={comm.id}
            comm={comm}
            isExpanded={expandedId === comm.id}
            onToggle={() => handleToggle(comm.id)}
            onEditCommission={onEditCommission}
          />
        ))}
      </div>
    </div>
  );
};

export default PendingCommList;