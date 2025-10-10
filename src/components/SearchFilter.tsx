/**
 * SearchFilter
 * Combine free-text search with optional advanced filters.
 *  Parent debounces if needed; simple client-side filtering downstream.
 */
import React, { useState, useMemo } from 'react';
import './SearchFilter.css';

interface SearchFilterProps {
  placeholder?: string;
  onSearchChange: (searchTerm: string) => void;
  onFilterChange?: (filters: FilterOptions) => void;
  showFilters?: boolean;
  className?: string;
}

export interface FilterOptions {
  status?: string[];
  paymentStatus?: string[];
  dateRange?: { start?: string; end?: string };
  priceRange?: { min?: number; max?: number };
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  placeholder = 'Search...',
  onSearchChange,
  onFilterChange,
  showFilters = true,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    onSearchChange('');
    onFilterChange?.({});
  };

  /**
   * Performance optimization: compute active filter state once rather than on every render.
   * Used to control clear button visibility and filter badge display.
   */
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchTerm || 
      filters.status?.length || 
      filters.paymentStatus?.length ||
      filters.dateRange?.start ||
      filters.dateRange?.end ||
      filters.priceRange?.min ||
      filters.priceRange?.max
    );
  }, [searchTerm, filters]);

  return (
    <div className={`search-filter ${className}`}>
      <div className="search-input-container">
        <div className="search-icon"></div>
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        
        {showFilters && (
          <button
            className={`filter-toggle ${showAdvancedFilters ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            🔧 Filters
          </button>
        )}
        
        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearFilters}>✕ Clear</button>
        )}
      </div>

      {showFilters && showAdvancedFilters && (
        <div className="advanced-filters">
          <div className="filter-section">
            <label>Status</label>
            <div className="checkbox-group">
              {['Pending', 'In Progress', 'Completed'].map(status => (
                <label key={status} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={(e) => {
                      const currentStatuses = filters.status || [];
                      const newStatuses = e.target.checked 
                        ? [...currentStatuses, status]
                        : currentStatuses.filter(s => s !== status);
                      handleFilterChange({ status: newStatuses });
                    }}
                  />
                  {status}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label>Payment Status</label>
            <div className="checkbox-group">
              {['Not Paid', 'Half Paid', 'Fully Paid'].map(payment => (
                <label key={payment} className={`checkbox-label ${filters.paymentStatus?.includes(payment) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={filters.paymentStatus?.includes(payment) || false}
                    onChange={(e) => {
                      const currentPayments = filters.paymentStatus || [];
                      const newPayments = e.target.checked 
                        ? [...currentPayments, payment]
                        : currentPayments.filter(p => p !== payment);
                      handleFilterChange({ paymentStatus: newPayments });
                    }}
                  />
                  <span>
                    {payment === 'Not Paid' ? '❌ Not Paid' : payment === 'Half Paid' ? '⏳ Half Paid' : '✅ Fully Paid'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <label>Price Range</label>
            <div className="range-inputs">
              <input
                type="number"
                placeholder="Min $"
                value={filters.priceRange?.min || ''}
                onChange={(e) => handleFilterChange({
                  priceRange: { ...filters.priceRange, min: e.target.value ? parseFloat(e.target.value) : undefined }
                })}
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max $"
                value={filters.priceRange?.max || ''}
                onChange={(e) => handleFilterChange({
                  priceRange: { ...filters.priceRange, max: e.target.value ? parseFloat(e.target.value) : undefined }
                })}
              />
            </div>
          </div>

          <div className="filter-section">
            <label>Date Range</label>
            <div className="date-inputs">
              <input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleFilterChange({
                  dateRange: { ...filters.dateRange, start: e.target.value || undefined }
                })}
              />
              <span>to</span>
              <input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleFilterChange({
                  dateRange: { ...filters.dateRange, end: e.target.value || undefined }
                })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
