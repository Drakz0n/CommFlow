import { SecurityValidator } from './validation';
import type { StorageClient, StorageCommission } from '../domain/schemas';

export interface BackupData {
  clients: StorageClient[];
  pendingCommissions: StorageCommission[];
  historyCommissions: StorageCommission[];
  settings: Record<string, unknown>;
  timestamp: string;
  version: string;
}

/**
 * Data protection system for preventing work loss from corrupted localStorage.
 * Business critical for freelancers who can't afford to lose client/project data.
 */
export class BackupManager {
  private static readonly BACKUP_KEYS = {
    clients: 'commflow-clients',
    clientsBackup: 'commflow-clients-backup',
    pending: 'commflow-pending-commissions',
    pendingBackup: 'commflow-pending-commissions-backup',
    history: 'commflow-history-commissions',
    historyBackup: 'commflow-history-commissions-backup',
    settings: 'commflow-settings',
    settingsBackup: 'commflow-settings-backup',
    lastBackup: 'commflow-last-backup-timestamp'
  };

  /**
   * Two-layer protection: sanitize data for security, then create backup before overwriting.
   * This prevents both XSS attacks and accidental data loss from corruption.
   */
  static saveWithBackup(key: keyof typeof BackupManager.BACKUP_KEYS, data: unknown): boolean {
    try {
      console.log(`BackupManager: Saving ${key} with data:`, data); // Debug logging
      const sanitizedData = SecurityValidator.sanitizeForStorage(data);
      const dataString = JSON.stringify(sanitizedData);
      
      // Preserve current data as rollback option before overwriting
      const currentData = localStorage.getItem(this.BACKUP_KEYS[key]);
      
      if (currentData) {
        const backupKey = `${key}Backup` as keyof typeof BackupManager.BACKUP_KEYS;
        if (this.BACKUP_KEYS[backupKey]) {
          localStorage.setItem(this.BACKUP_KEYS[backupKey], currentData);
        }
      }
      
      localStorage.setItem(this.BACKUP_KEYS[key], dataString);
      localStorage.setItem(this.BACKUP_KEYS.lastBackup, new Date().toISOString());
      console.log(`BackupManager: Successfully saved ${key} to localStorage`); // Debug logging
      
      return true;
    } catch (error) {
      console.error(`Failed to save data with backup for ${key}:`, error);
      return false;
    }
  }

  /**
   * Load data with fallback to backup if main data is corrupted
   */
  static loadWithBackupFallback(key: keyof typeof BackupManager.BACKUP_KEYS): unknown {
    try {
      // Try to load main data
      const mainData = localStorage.getItem(this.BACKUP_KEYS[key]);
      if (mainData) {
        try {
          return JSON.parse(mainData);
        } catch (parseError) {
          console.warn(`Main data corrupted for ${key}, trying backup...`);
        }
      }
      
      // Fallback to backup
      const backupKey = `${key}Backup` as keyof typeof BackupManager.BACKUP_KEYS;
      if (this.BACKUP_KEYS[backupKey]) {
        const backupData = localStorage.getItem(this.BACKUP_KEYS[backupKey]);
        if (backupData) {
          try {
            console.info(`Restored ${key} from backup`);
            return JSON.parse(backupData);
          } catch (backupParseError) {
            console.error(`Backup data also corrupted for ${key}`);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to load data for ${key}:`, error);
      return null;
    }
  }

  /**
   * Create a complete backup of all data
   */
  static createFullBackup(): BackupData {
    const backup: BackupData = {
      clients: (this.loadWithBackupFallback('clients') as StorageClient[]) || [],
      pendingCommissions: (this.loadWithBackupFallback('pending') as StorageCommission[]) || [],
      historyCommissions: (this.loadWithBackupFallback('history') as StorageCommission[]) || [],
      settings: (this.loadWithBackupFallback('settings') as Record<string, unknown>) || {},
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    return backup;
  }

  /**
   * Restore from backup data
   */
  static restoreFromBackup(backupData: BackupData): boolean {
    try {
      // Validate backup data structure
      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data structure');
      }

      // Save current data as emergency backup before restore
      this.createEmergencyBackup();

      // Restore each data type
      if (backupData.clients) {
        localStorage.setItem(this.BACKUP_KEYS.clients, JSON.stringify(backupData.clients));
      }
      
      if (backupData.pendingCommissions) {
        localStorage.setItem(this.BACKUP_KEYS.pending, JSON.stringify(backupData.pendingCommissions));
      }
      
      if (backupData.historyCommissions) {
        localStorage.setItem(this.BACKUP_KEYS.history, JSON.stringify(backupData.historyCommissions));
      }
      
      if (backupData.settings) {
        localStorage.setItem(this.BACKUP_KEYS.settings, JSON.stringify(backupData.settings));
      }

      // Update backup timestamp
      localStorage.setItem(this.BACKUP_KEYS.lastBackup, new Date().toISOString());

      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Create emergency backup before major operations
   */
  private static createEmergencyBackup(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const emergencyData = this.createFullBackup();
    
    try {
      localStorage.setItem(`commflow-emergency-backup-${timestamp}`, JSON.stringify(emergencyData));
      
      // Keep only the last 3 emergency backups to prevent storage bloat
      this.cleanupEmergencyBackups();
    } catch (error) {
      console.warn('Failed to create emergency backup:', error);
    }
  }

  /**
   * Clean up old emergency backups
   */
  private static cleanupEmergencyBackups(): void {
    try {
      const emergencyKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('commflow-emergency-backup-'))
        .sort()
        .reverse(); // Most recent first

      // Remove all but the 3 most recent
      emergencyKeys.slice(3).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to cleanup emergency backups:', error);
    }
  }

  /**
   * Validate backup data structure
   */
  private static validateBackupData(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // Check required properties
    const requiredProps = ['clients', 'pendingCommissions', 'historyCommissions', 'settings'];
    return requiredProps.every(prop => prop in (data as Record<string, unknown>));
  }

  /**
   * Get backup statistics
   */
  static getBackupInfo(): {
    hasBackups: boolean;
    lastBackupTime: string | null;
    backupSizes: Record<string, number>;
    emergencyBackupsCount: number;
  } {
    const lastBackup = localStorage.getItem(this.BACKUP_KEYS.lastBackup);
    
    const backupSizes: Record<string, number> = {};
    Object.entries(this.BACKUP_KEYS).forEach(([key, storageKey]) => {
      const data = localStorage.getItem(storageKey);
      backupSizes[key] = data ? data.length : 0;
    });

    const emergencyBackupsCount = Object.keys(localStorage)
      .filter(key => key.startsWith('commflow-emergency-backup-'))
      .length;

    return {
      hasBackups: !!lastBackup,
      lastBackupTime: lastBackup,
      backupSizes,
      emergencyBackupsCount
    };
  }

  /**
   * Force create backup of all current data
   */
  static forceBackupAll(): boolean {
    try {
      const keys: Array<keyof typeof BackupManager.BACKUP_KEYS> = ['clients', 'pending', 'history', 'settings'];
      
      keys.forEach(key => {
        const data = localStorage.getItem(this.BACKUP_KEYS[key]);
        if (data) {
          const backupKey = `${key}Backup` as keyof typeof BackupManager.BACKUP_KEYS;
          if (this.BACKUP_KEYS[backupKey]) {
            localStorage.setItem(this.BACKUP_KEYS[backupKey], data);
          }
        }
      });

      localStorage.setItem(this.BACKUP_KEYS.lastBackup, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Failed to force backup all data:', error);
      return false;
    }
  }
}
