/**
 * ExportImportData
 * Expose data directory path and simple actions until full export/import is implemented.
 *  DataStorage is backed by Tauri commands; bulk delete not yet supported.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DataStorage } from '../utils/dataStorage';
import './ExportImportData.css';

interface ExportImportDataProps { onClose: () => void; }

const ExportImportData: React.FC<ExportImportDataProps> = ({ onClose }) => {
  const [dataDirectory, setDataDirectory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Resolve data directory on mount so user sees where files live
  useEffect(() => {
    const getDataDir = async () => {
      try {
        const dir = await DataStorage.getDataDirectory();
        setDataDirectory(dir);
      } catch {
        setDataDirectory('Unavailable');
      }
    };
    getDataDir();
  }, []);

  const handleOpenDataFolder = async () => {
    try {
      const dir = await DataStorage.getDataDirectory();
      setStatus(`Opening data directory: ${dir}`);
      // TODO: Implement actual folder opening with Tauri command
    } catch {
      setStatus('Failed to locate data directory');
    }
  };

  // Note: Full recursive delete requires a dedicated backend command for safety
  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL clients and commissions? This cannot be undone.')) return;
    try {
      setStatus('Please manually remove files inside the data directory until a bulk delete command is implemented.');
    } catch {
      setStatus('Failed to delete data');
    }
  };

  return createPortal(
    <div className="export-import-overlay">
      <div className="export-import-modal">
        <div className="modal-header">
          <h2>Data</h2>
          <button className="cf-btn cf-btn--secondary cf-btn--small" onClick={onClose}>Close</button>
        </div>
        <div className="modal-content">
          <div className="directory-label">Directory</div>
          <div className="data-path"><code>{dataDirectory}</code></div>
          {status && <div className="status-message">{status}</div>}
          <div className="cf-btn-group button-group">
            <button className="cf-btn cf-btn--primary" onClick={handleOpenDataFolder}>Open Folder</button>
            <button className="cf-btn cf-btn--danger" onClick={handleDeleteAll}>Delete All</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExportImportData;