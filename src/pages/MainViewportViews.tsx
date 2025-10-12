/**
 * Individual view components for the main navigation system.
 * Each view focuses on specific business workflows: dashboard, client management, project tracking.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ClientList from '../components/ClientList';
import ClientModal from '../components/ClientModal';
import { useClients } from '../contexts/ClientContext';
import { useCommissions } from '../contexts/CommissionContext';
import { useSettings } from '../contexts/SettingsContext';
import { useStats } from '../hooks/useStats';
import type { Client } from '../contexts/ClientContext';
import '../components/SortModal.css';
import './ConfigView.css';

export type ViewType = 'main' | 'clients' | 'pending' | 'history' | 'config';

/**
 * Dashboard overview showing business health at a glance.
 * Gives freelancers immediate sense of workload and progress.
 */
export function MainView() {
  const { t } = useTranslation(['dashboard', 'common']);
  const stats = useStats();
  const { settings } = useSettings();
  
  return (
    <>
      <div className="comm-welcome">{t('dashboard:welcome')} <span className="comm-user">{settings.userName}</span><span className="comm-!"> ! </span></div>
      
      {/* Quick workload assessment without overwhelming detail */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '20px', 
        color: '#fff', 
        fontSize: '0.95rem',
      }}>
        <span style={{ color: '#00acc1', fontWeight: '600' }}>{stats.pendingCommissions} {t('dashboard:stats.pending')}</span>
        <span style={{ margin: '0 15px', color: '#4a5568' }}>•</span>
        <span style={{ color: '#ff9800', fontWeight: '600' }}>{stats.inProgressCommissions} {t('dashboard:stats.inProgress')}</span>
        <span style={{ margin: '0 15px', color: '#4a5568' }}>•</span>
        <span style={{ color: '#4caf50', fontWeight: '600' }}>{stats.completedCommissions} {t('dashboard:stats.completed')}</span>
      </div>
    </>
  );
}

/**
 * Client relationship management focused on communication and project history.
 * Central hub for managing ongoing business relationships.
 */
export function ClientsView() {
  const { t } = useTranslation('clients');
  const { addClient, updateClient } = useClients();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const handleAddClient = () => {
    setEditingClient(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleModalSubmit = (clientData: Omit<Client, 'id' | 'totalCommissions' | 'joinDate' | 'lastCommission'>) => {
    addClient(clientData);
  };

  const handleModalUpdate = (id: string, updates: Partial<Client>) => {
    updateClient(id, updates);
  };
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      height: '100vh',
      maxHeight: '90vh',
      boxSizing: 'border-box',
      paddingTop: '0px',
      paddingBottom: '95px',
      overflow: 'hidden',
    }}>
      <div style={{
        marginBottom: '40px',
        fontSize: '1.8rem',
        fontWeight: 600,
        color: '#fff',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {t('title')}
      </div>
      
      {/* Container for the list with proper sizing and scrolling */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '700px',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        minHeight: 0,
      }}>
        <ClientList />
      </div>
      
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '20px',
        top: 'auto', // Fixed position from top
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexShrink: 0, // Don't compress buttons
        paddingLeft: '40px',
        paddingRight: '40px',
      }}>
        <button
          className="cf-btn cf-btn--primary"
          onClick={handleAddClient}
        >
          {t('addClient')}
        </button>
      </div>

      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        onUpdate={handleModalUpdate}
        client={editingClient}
        mode={modalMode}
      />
    </div>
  );
}

import PendingCommList from '../components/PendingCommList';
import CommissionModal from '../components/CommissionModal';
import EditCommissionModal from '../components/EditCommissionModal';
import SortModal from '../components/SortModal';
import type { PendingCommission } from '../contexts/CommissionContext';
import type { SortOptions } from '../components/SortModal';

export function PendingView() {
  const { t } = useTranslation('commissions');
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<PendingCommission | null>(null);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
    paymentPriority: 'unpaid-first'
  });

  const handleEditCommission = (commission: PendingCommission) => {
    setEditingCommission(commission);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingCommission(null);
  };

  const handleSortChange = (newSortOptions: SortOptions) => {
    setSortOptions(newSortOptions);
  };
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      height: '100vh',
      maxHeight: '90vh',
      boxSizing: 'border-box',
      paddingTop: '0px',
      paddingBottom: '95px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        marginBottom: '40px',
        fontSize: '1.8rem',
        fontWeight: 600,
        color: '#fff',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {t('title')}
      </div>
      
      {/* Container for the list with proper sizing and scrolling */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '700px',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        minHeight: 0,
      }}>
        <PendingCommList 
          onEditCommission={handleEditCommission}
          sortOptions={sortOptions}
        />
      </div>
      
      {/* Sort Button - Bottom Left */}
      <button
        className="cf-btn cf-btn--secondary sort-button"
        onClick={() => setIsSortModalOpen(true)}
      >
        {t('sortButton')}
      </button>
      
      {/* Add Commission Button - Bottom Right */}
      <div style={{
        position: 'absolute',
        right: 0,
        bottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexShrink: 0,
        paddingRight: '40px',
      }}>
        <button
          className="cf-btn cf-btn--primary"
          onClick={() => setIsCommissionModalOpen(true)}
        >
          {t('addCommission')}
        </button>
      </div>

      <CommissionModal
        isOpen={isCommissionModalOpen}
        onClose={() => setIsCommissionModalOpen(false)}
      />
      
      <EditCommissionModal
        isOpen={isEditModalOpen}
        commission={editingCommission}
        onClose={handleCloseEditModal}
      />
      
      <SortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        onSortChange={handleSortChange}
        currentSort={sortOptions}
      />
    </div>
  );
}

import HistoryCommList from '../components/HistoryCommList';
import ExportImportData from '../components/ExportImportData';

export function HistoryView() {
  const { t } = useTranslation('commissions');
  const { historyCommissions, deleteHistoryCommission } = useCommissions();
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    sortBy: 'date',
    sortOrder: 'desc',
    paymentPriority: 'unpaid-first'
  });

  const handleSortChange = (newSortOptions: SortOptions) => {
    setSortOptions(newSortOptions);
  };
  
  const handleArchiveAll = () => {
    if (historyCommissions.length === 0) {
      alert(t('noCommissionsToArchive'));
      return;
    }
    
    const confirmArchive = confirm(
      t('archiveAllConfirm', { count: historyCommissions.length })
    );
    
    if (confirmArchive) {
      // Archive all commissions by deleting them (we could implement a separate archive state if needed)
      historyCommissions.forEach(commission => {
        deleteHistoryCommission(commission.id);
      });
    }
  };
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      height: '100vh',
      maxHeight: '90vh',
      boxSizing: 'border-box',
      paddingTop: '0px',
      paddingBottom: '95px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        marginBottom: '40px',
        fontSize: '1.8rem',
        fontWeight: 600,
        color: '#fff',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {t('historyTitle')}
      </div>
      
      {/* Container for the list with proper sizing and scrolling */}
      <div style={{
        flex: 1,
        width: '100%',
        maxWidth: '700px',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        minHeight: 0,
      }}>
        <HistoryCommList sortOptions={sortOptions} />
      </div>
      
      {/* Sort Button - Bottom Left */}
      <button
        className="cf-btn cf-btn--secondary sort-button"
        onClick={() => setIsSortModalOpen(true)}
      >
        {t('sortButton')}
      </button>
      
      {/* Archive Button - Bottom Right */}
      <div style={{
        position: 'absolute',
        right: 0,
        bottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexShrink: 0,
        paddingRight: '40px',
      }}>
        <button
          className="cf-btn cf-btn--secondary"
          onClick={handleArchiveAll}
        >
          {t('archiveAll', { count: historyCommissions.length })}
        </button>
      </div>
      
      <SortModal
        isOpen={isSortModalOpen}
        onClose={() => setIsSortModalOpen(false)}
        onSortChange={handleSortChange}
        currentSort={sortOptions}
      />
    </div>
  );
}

export const ConfigView = () => {
  const { t } = useTranslation('config');
  const { settings, updateSettings } = useSettings();
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [localUserName, setLocalUserName] = useState(settings.userName);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local state when settings change (e.g., on load)
  useEffect(() => {
    setLocalUserName(settings.userName);
    setHasUnsavedChanges(false);
  }, [settings.userName]);

  // Debounced save effect - Fixed dependency array
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localUserName !== settings.userName && localUserName.trim()) {
        console.log('Auto-saving username:', localUserName); // Debug logging
        updateSettings({ userName: localUserName });
        setHasUnsavedChanges(false);
      }
    }, 500); // Save 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [localUserName, settings.userName]); // Removed updateSettings from dependencies

  const handleAnimationToggle = () => {
    updateSettings({ animations: !settings.animations });
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalUserName(e.target.value);
    setHasUnsavedChanges(e.target.value !== settings.userName);
  };

  const handleSaveUserName = () => {
    if (localUserName.trim() && localUserName !== settings.userName) {
      updateSettings({ userName: localUserName });
      setHasUnsavedChanges(false);
    }
  };

  const openExportImport = () => {
    setIsExportImportOpen(true);
  };

  const closeExportImport = () => {
    setIsExportImportOpen(false);
  };

  return (
    <div className="config-view">
      <div className="settings-section">
        <h2>{t('title')}</h2>
        
        {/* User Name Setting - First and separated */}
        <div className="setting-item user-setting">
          <label className="setting-label">
            <span className="setting-name">{t('settings.displayName')}</span>
            <span className="setting-description">
              {t('settings.displayNameDescription')}
            </span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={localUserName}
              onChange={handleUserNameChange}
              placeholder={t('settings.displayNamePlaceholder')}
              style={{
                background: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '4px',
                color: '#fff',
                padding: '8px 12px',
                fontSize: '0.9rem',
                width: '200px',
                maxWidth: '100%',
              }}
            />
            <button
              className="cf-btn cf-btn--success"
              onClick={handleSaveUserName}
              disabled={!localUserName.trim() || (!hasUnsavedChanges && localUserName === settings.userName)}
            >
              {t('settings.save')}
            </button>
          </div>
        </div>

        {/* Separator */}
        <div style={{ 
          height: '1px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          margin: '30px 0 20px 0' 
        }} />
        
        {/* Language Selection */}
        <div className="setting-item">
          <label className="setting-label">
            <span className="setting-name">{t('settings.language')}</span>
            <span className="setting-description">
              {t('settings.languageDescription')}
            </span>
          </label>
          <select
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value })}
            style={{
              background: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '4px',
              color: '#fff',
              padding: '8px 12px',
              fontSize: '0.9rem',
              width: '200px',
              maxWidth: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label className="setting-label">
            <span className="setting-name">{t('settings.animations')}</span>
            <span className="setting-description">
              {t('settings.animationsDescription')}
            </span>
          </label>
          <div className="toggle-container">
            <input
              type="checkbox"
              id="animations-toggle"
              checked={settings.animations}
              onChange={handleAnimationToggle}
              className="toggle-input"
            />
            <label htmlFor="animations-toggle" className="toggle-label">
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Export/Import Data Section */}
        <div className="setting-item">
          <label className="setting-label">
            <span className="setting-name">{t('dataManagement.title')}</span>
            <span className="setting-description">
              {t('dataManagement.description')}
            </span>
          </label>
          <button 
            className="export-import-btn cf-btn cf-btn--success"
            onClick={openExportImport}
            style={undefined}
          >
            {t('dataManagement.button')}
          </button>
        </div>
      </div>

      {/* Export/Import Modal */}
      {isExportImportOpen && (
        <ExportImportData onClose={closeExportImport} />
      )}
    </div>
  );
};