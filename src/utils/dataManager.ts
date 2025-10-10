// Data export/import utilities
export class DataManager {
  
  // Progressive enhancement: modern save dialog where supported, fallback to download
  static async exportAllData() {
    try {
      const data = {
        clients: JSON.parse(localStorage.getItem('commflow-clients') || '[]'),
        pendingCommissions: JSON.parse(localStorage.getItem('commflow-pending-commissions') || '[]'),
        historyCommissions: JSON.parse(localStorage.getItem('commflow-history-commissions') || '[]'),
        settings: JSON.parse(localStorage.getItem('commflow-settings') || '{}'),
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const dataStr = JSON.stringify(data, null, 2);
      const defaultFileName = `commflow-backup-${new Date().toISOString().split('T')[0]}.json`;

      // Chrome/Edge native save dialog provides better UX than forced downloads
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{
              description: 'JSON files',
              accept: {
                'application/json': ['.json'],
              },
            }],
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(dataStr);
          await writable.close();
          
          return { success: true, message: 'Data exported successfully!' };
        } catch (error) {
          // User cancellation is normal behavior, not an error
          if (error instanceof Error && error.name === 'AbortError') {
            return { success: false, message: 'Export cancelled by user.' };
          }
        }
      }
      
      // Legacy browsers: automatic download to default folder
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = defaultFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Prevent memory leaks
      
      return { success: true, message: 'Data exported successfully!' };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, message: 'Failed to export data. Please try again.' };
    }
  }

  // Import with automatic backup to enable rollback on failures
  static async importData(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!this.validateImportData(data)) {
        return { success: false, message: 'Invalid file format. Please select a valid CommFlow backup file.' };
      }

      // Safety net: backup existing data before overwriting
      const backupData = {
        clients: localStorage.getItem('commflow-clients'),
        pendingCommissions: localStorage.getItem('commflow-pending-commissions'),
        historyCommissions: localStorage.getItem('commflow-history-commissions'),
        settings: localStorage.getItem('commflow-settings')
      };
      
      localStorage.setItem('commflow-backup-before-import', JSON.stringify(backupData));

      // Only import fields that exist in the backup to preserve partial exports
      if (data.clients) {
        localStorage.setItem('commflow-clients', JSON.stringify(data.clients));
      }
      if (data.pendingCommissions) {
        localStorage.setItem('commflow-pending-commissions', JSON.stringify(data.pendingCommissions));
      }
      if (data.historyCommissions) {
        localStorage.setItem('commflow-history-commissions', JSON.stringify(data.historyCommissions));
      }
      if (data.settings) {
        localStorage.setItem('commflow-settings', JSON.stringify(data.settings));
      }

      return { success: true, message: 'Data imported successfully! The page will reload to apply changes.' };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, message: 'Failed to import data. Please check the file format.' };
    }
  }

  // Minimal validation to prevent corrupt imports while staying flexible for future formats
  private static validateImportData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    if (!data.version) return false;
    
    // Must contain at least one data section to be a valid backup
    const hasData = data.clients || data.pendingCommissions || data.historyCommissions || data.settings;
    if (!hasData) return false;
    
    return true;
  }

  // Storage monitoring to warn users before hitting browser limits
  static getStorageStats() {
    try {
      const clients = localStorage.getItem('commflow-clients') || '[]';
      const pending = localStorage.getItem('commflow-pending-commissions') || '[]';
      const history = localStorage.getItem('commflow-history-commissions') || '[]';
      const settings = localStorage.getItem('commflow-settings') || '{}';
      
      const totalSize = clients.length + pending.length + history.length + settings.length;
      const clientsSize = clients.length;
      const pendingSize = pending.length;
      const historySize = history.length;
      const settingsSize = settings.length;
      
      // Conservative estimate: most browsers allow 5-10MB
      const estimatedLimit = 5 * 1024 * 1024;
      const usagePercentage = (totalSize / estimatedLimit) * 100;
      
      return {
        totalSize,
        clientsSize,
        pendingSize,
        historySize,
        settingsSize,
        usagePercentage: Math.min(usagePercentage, 100),
        formattedSize: this.formatBytes(totalSize)
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Nuclear option: automatic backup before destruction to prevent accidental data loss
  static clearAllData(): { success: boolean; message: string } {
    try {
      this.exportAllData(); // Safety backup
      
      localStorage.removeItem('commflow-clients');
      localStorage.removeItem('commflow-pending-commissions');
      localStorage.removeItem('commflow-history-commissions');
      localStorage.removeItem('commflow-settings');
      
      return { success: true, message: 'All data cleared successfully. A backup was automatically downloaded.' };
    } catch (error) {
      console.error('Failed to clear data:', error);
      return { success: false, message: 'Failed to clear data. Please try again.' };
    }
  }
}
