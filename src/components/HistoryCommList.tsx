/**
 * HistoryCommList
 * Lists completed commissions with sorting and controlled expansion.
 *  Sorting is stable enough for small lists; parent provides sort options.
 */
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommissions } from '../contexts/CommissionContext';
import HistoryCommCard from './HistoryCommCard';
import type { HistoryCommission } from '../contexts/CommissionContext';
import type { SortOptions } from './SortModal';
import './CommListShared.css';
import './HistoryCommList.css';

interface HistoryCommListProps {
  sortOptions?: SortOptions;
}

const HistoryCommList: React.FC<HistoryCommListProps> = ({ 
  sortOptions = { sortBy: 'date', sortOrder: 'desc', paymentPriority: 'unpaid-first' }
}) => {
  const { t } = useTranslation('commissions');
  const { historyCommissions } = useCommissions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

    // Apply primary sort by selected field, then stabilize by payment priority for quick scanning
  const sortedHistory = useMemo(() => {
    let sorted = [...historyCommissions];

    // Apply multi-level sorting for intuitive data organization
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOptions.sortBy) {
        case 'date':
          // Prefer completedDate; fallback to original date
          const aDate = new Date(a.completedDate || a.date).getTime();
          const bDate = new Date(b.completedDate || b.date).getTime();
          comparison = aDate - bDate;
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

    // Secondary sort: payment priority aids quick triage
    sorted.sort((a, b) => {
      const paymentPriority = { 'not-paid': 0, 'half-paid': 1, 'fully-paid': 2 };
      const aPriority = paymentPriority[a.paymentStatus] || 0;
      const bPriority = paymentPriority[b.paymentStatus] || 0;
      
      return sortOptions.paymentPriority === 'unpaid-first' ? aPriority - bPriority : bPriority - aPriority;
    });

    return sorted;
  }, [historyCommissions, sortOptions]);

  if (sortedHistory.length === 0) {
    return (
      <div className="comm-list-container-shared">
        <div className="comm-list-shared">
          <div className="comm-list-empty-shared">
            <div className="empty-icon">📚</div>
            <h3>{t('empty.noHistory')}</h3>
            <p>{t('empty.historySubtext')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comm-list-container-shared">
      <div className="comm-list-shared">
        {sortedHistory.map((commission: HistoryCommission) => (
          <HistoryCommCard 
            key={commission.id} 
            comm={commission} 
            isExpanded={expandedId === commission.id}
            onToggle={() => toggle(commission.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default HistoryCommList;
