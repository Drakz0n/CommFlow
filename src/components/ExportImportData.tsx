/**
 * ExportImportData
 * Expose data directory path and simple actions until full export/import is implemented.
 *  DataStorage is backed by Tauri commands; bulk delete not yet supported.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { DataStorage } from '../utils/dataStorage';
import './ExportImportData.css';

interface ExportImportDataProps { onClose: () => void; }

const ExportImportData: React.FC<ExportImportDataProps> = ({ onClose }) => {
  const { t } = useTranslation('config');
  const [dataDirectory, setDataDirectory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Resolve data directory on mount so user sees where files live
  useEffect(() => {
    const getDataDir = async () => {
      try {
        const dir = await DataStorage.getDataDirectory();
        setDataDirectory(dir);
      } catch {
        setDataDirectory(t('dataManagement.modal.unavailable'));
      }
    };
    getDataDir();
  }, [t]);

  const handleOpenDataFolder = async () => {
    try {
      const dir = await DataStorage.getDataDirectory();
      setStatus(t('dataManagement.modal.openingDirectory', { dir }));
      // TODO: Implement actual folder opening with Tauri command
    } catch {
      setStatus(t('dataManagement.modal.failedToLocate'));
    }
  };

  // Note: Full recursive delete requires a dedicated backend command for safety
  const handleDeleteAll = async () => {
    if (!confirm(t('dataManagement.deleteAllConfirm'))) return;
    try {
      setStatus(t('dataManagement.modal.manualDeleteMessage'));
    } catch {
      setStatus(t('dataManagement.modal.failedToDelete'));
    }
  };

  return createPortal(
    <div className="export-import-overlay">
      <div className="export-import-modal">
        <div className="modal-header">
          <h2>{t('dataManagement.modal.title')}</h2>
          <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={onClose}>{t('dataManagement.modal.close')}</button>
        </div>
        <div className="modal-content">
          <div className="directory-label">{t('dataManagement.modal.directoryLabel')}</div>
          <div className="data-path"><code>{dataDirectory}</code></div>
          {status && <div className="status-message">{status}</div>}
          <div className="cf-btn-group button-group">
            <button className="cf-btn cf-btn--primary" onClick={handleOpenDataFolder}>{t('dataManagement.modal.openFolder')}</button>
            <button className="cf-btn cf-btn--danger" onClick={handleDeleteAll}>{t('dataManagement.modal.deleteAll')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportImportData;