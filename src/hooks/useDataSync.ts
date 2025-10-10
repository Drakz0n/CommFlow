import { useEffect, useRef, useCallback } from 'react';
import { useClients } from '../contexts/ClientContext';
import { useCommissions } from '../contexts/CommissionContext';

// Global state to prevent concurrent sync operations and expose sync externally
let globalSyncFunction: (() => Promise<void>) | null = null;
let isCurrentlySyncing = false;

/**
 * Data synchronization hook for keeping UI state fresh with file system changes.
 * Enables both manual and automatic polling modes to handle external file modifications.
 */
export const useDataSync = (enabled: boolean = false, intervalMs: number = 3000) => {
  const { loadAllClients } = useClients();
  const { loadAllCommissions } = useCommissions();
  const intervalRef = useRef<number | null>(null);

  // Concurrency protection prevents multiple simultaneous sync operations
  const syncNow = useCallback(async () => {
    if (isCurrentlySyncing) {
      return;
    }
    
    try {
      isCurrentlySyncing = true;
      await Promise.all([
        loadAllClients(),
        loadAllCommissions()
      ]);
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      isCurrentlySyncing = false;
    }
  }, [loadAllClients, loadAllCommissions]);

  // Export sync function globally so contexts can trigger refreshes after mutations
  useEffect(() => {
    globalSyncFunction = syncNow;
    return () => {
      globalSyncFunction = null;
    };
  }, [syncNow]);

  // Polling mechanism for scenarios where file system changes aren't otherwise detected
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(syncNow, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, syncNow]);

  return { syncNow };
};

// External sync trigger for contexts and other modules that need to refresh data
export const triggerDataSync = async () => {
  if (isCurrentlySyncing) {
    return;
  }
  
  if (globalSyncFunction) {
    await globalSyncFunction();
  } else {
    console.warn('Data sync function not available');
  }
};
