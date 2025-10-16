import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { PersistenceService } from '../services/PersistenceService';
import type { Commission as StorageCommission } from '../utils/dataStorage';
import { storageCommissionToDomain, domainCommissionToStorage } from '../domain/mappers';
import { useClients } from './ClientContext';

/**
 * Commission workflow management for tracking project lifecycle.
 * Handles the business flow from initial quote to completed payment.
 */

export interface ClientInfo {
  id: string;
  name: string;
  contactInfo: string;
  pfp?: string;
}

export interface CommissionRef {
  name: string;
  url?: string;
  type: 'image' | 'text';
}

export interface BaseCommission {
  id: string;
  client: ClientInfo;
  commType: string;
  price: number;
  description: string;
  refs: CommissionRef[];
  date: string;
  paymentStatus: 'not-paid' | 'half-paid' | 'fully-paid';
  isPinned?: boolean;
}

/**
 * Active projects that need attention or are in progress.
 * These show up in the main workflow dashboard.
 */
export interface PendingCommission extends BaseCommission {
  status: 'Pending' | 'In Progress';
}

/**
 * Completed projects for record-keeping and analytics.
 * Tracks completion dates for performance analysis.
 */
export interface HistoryCommission extends BaseCommission {
  status: 'Completed';
  originalDate: string;
  completedDate: string;
}

/**
 * Commission management operations for the entire project workflow.
 * Centralizes all business logic for tracking projects from quote to payment.
 */
interface CommissionContextState {
  pendingCommissions: PendingCommission[];
  historyCommissions: HistoryCommission[];
  isLoading: boolean;
  
  // Workflow management for active projects
  addPendingCommission: (commission: Omit<PendingCommission, 'id' | 'date'>) => Promise<void>;
  updatePendingCommission: (id: string, updates: Partial<PendingCommission>) => Promise<void>;
  deletePendingCommission: (id: string) => Promise<void>;
  markCommissionComplete: (id: string) => Promise<void>;
  markCommissionInProgress: (id: string) => Promise<void>;
  
  // Archive management for completed projects
  deleteHistoryCommission: (id: string) => Promise<void>;
  moveToHistory: (pendingCommission: PendingCommission) => Promise<void>;
  markCommissionIncomplete: (id: string) => Promise<void>;
  updateHistoryPaymentStatus: (id: string, status: 'not-paid' | 'half-paid' | 'fully-paid') => Promise<void>;
  
  // Payment tracking for cash flow management
  updatePaymentStatus: (id: string, status: 'not-paid' | 'half-paid' | 'fully-paid', isPending?: boolean) => Promise<void>;
  
  // Pin management for commission prioritization
  togglePin: (id: string) => Promise<void>;
  
  // Data synchronization with file system
  loadAllCommissions: () => Promise<void>;
  
  // Business intelligence and reporting
  searchCommissions: (query: string, type: 'pending' | 'history') => PendingCommission[] | HistoryCommission[];
  
  // Financial analytics for business insights
  getTotalEarnings: () => number;
  getPendingEarnings: () => number;
  getCompletedEarnings: () => number;
  getClientCommissions: (clientId: string) => { pending: PendingCommission[], history: HistoryCommission[] };
}

const CommissionContext = createContext<CommissionContextState | undefined>(undefined);

export const useCommissions = () => {
  const context = useContext(CommissionContext);
  if (!context) {
    throw new Error('useCommissions must be used within a CommissionProvider');
  }
  return context;
};

interface CommissionProviderProps {
  children: ReactNode;
}

export const CommissionProvider: React.FC<CommissionProviderProps> = ({ children }) => {
  const { updateClientStats, getClientById } = useClients();
  const [pendingCommissions, setPending] = useState<PendingCommission[]>([]);
  const [historyCommissions, setHistory] = useState<HistoryCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Data transformation between storage layer and UI layer.
   * Handles legacy price field migrations and domain mapping complexities.
   */


  const convertStorageToLocal = useCallback(async (s: StorageCommission): Promise<PendingCommission | HistoryCommission> => {
    // Legacy compatibility: some old records have 'price' instead of 'price_cents'
    const normalized: any = { ...s };
    if (normalized.price == null && normalized.price_cents != null) {
      normalized.price = normalized.price_cents / 100;
    }
    if (normalized.price == null) normalized.price = 0;
    const domain = storageCommissionToDomain(normalized);

    // Properly enrich client information
    const fullClientInfo = getClientById(domain.client.id) || domain.client;

    // Convert from domain format back to UI format for context state
    const base = { 
      id: domain.id, 
      client: fullClientInfo, 
      commType: domain.commType, 
      price: domain.priceCents / 100, 
      description: domain.description, 
      refs: domain.refs, 
      date: domain.date, 
      paymentStatus: domain.paymentStatus 
    };
    
    if (domain.status === 'Completed') { 
      return { 
        ...base, 
        status: 'Completed', 
        originalDate: domain.originalDate || base.date, 
        completedDate: domain.completedDate || base.date 
      }; 
    }
    return { ...base, status: domain.status as 'Pending' | 'In Progress' };
  }, [getClientById]); // <-- Depend on getClientById to ensure latest client info

  const convertLocalToStorage = useCallback((c: PendingCommission | HistoryCommission): StorageCommission => {
    const domainLike = { 
      id: c.id, 
      client: c.client, 
      commType: c.commType, 
      priceCents: Math.round(c.price * 100), 
      description: c.description, 
      refs: c.refs || [], // Include refs for image mapping
      date: c.date, 
      paymentStatus: c.paymentStatus, 
      status: c.status, 
      originalDate: 'originalDate' in c ? c.originalDate : undefined, 
      completedDate: 'completedDate' in c ? c.completedDate : undefined 
    } as any;
    return domainCommissionToStorage(domainLike);
  }, []);

  /**
   * Initial data load on app startup.
   * Gracefully handles corrupted data by filtering out failed conversions.
   */
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);

        const pendingStorage = await PersistenceService.getCommissions('pending');
        const pendingConverted = (await Promise.all(
          pendingStorage.map(async sc => { 
            try { 
              return await convertStorageToLocal(sc); 
            } catch { 
              return null; 
            } 
          })
        )).filter(Boolean) as (PendingCommission|HistoryCommission)[];

        const historyStorage = await PersistenceService.getCommissions('completed');
        const historyConverted = (await Promise.all(
          historyStorage.map(async sc => { 
            try { 
              return await convertStorageToLocal(sc); 
            } catch { 
              return null; 
            } 
          })
        )).filter(Boolean) as (PendingCommission|HistoryCommission)[];

        setPending(pendingConverted.filter(c => c.status !== 'Completed') as PendingCommission[]);
        setHistory(historyConverted.filter(c => c.status === 'Completed') as HistoryCommission[]);

      } catch (e) {
        console.error('Error loading commissions:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [convertStorageToLocal]);

  /**
   * Manual data refresh for when users need to sync external changes.
   * Essential for collaborative workflows or when data gets corrupted.
   */
  const loadAllCommissions = useCallback(async () => {
    try {
      setIsLoading(true);

      const pendingStorage = await PersistenceService.getCommissions('pending');
      const pendingConverted = (await Promise.all(
        pendingStorage.map(async sc => { 
          try { 
            return await convertStorageToLocal(sc); 
          } catch { 
            return null; 
          } 
        })
      )).filter(Boolean) as (PendingCommission|HistoryCommission)[];

      const historyStorage = await PersistenceService.getCommissions('completed');
      const historyConverted = (await Promise.all(
        historyStorage.map(async sc => { 
          try { 
            return await convertStorageToLocal(sc); 
          } catch { 
            return null; 
          } 
        })
      )).filter(Boolean) as (PendingCommission|HistoryCommission)[];

      setPending(pendingConverted.filter(c => c.status !== 'Completed') as PendingCommission[]);
      setHistory(historyConverted.filter(c => c.status === 'Completed') as HistoryCommission[]);

    } catch (e) {
      console.error('Error reloading commissions:', e);
    } finally {
      setIsLoading(false);
    }
  }, [convertStorageToLocal]);

  /**
   * Keep client analytics up-to-date when commission data changes.
   * Business intelligence depends on accurate relationship tracking.
   */
  const recomputeClientStats = useCallback((clientId: string) => {
    const clientPending = pendingCommissions.filter(c => c.client.id === clientId);
    const clientHistory = historyCommissions.filter(c => c.client.id === clientId);
    const all = [...clientPending, ...clientHistory];
    updateClientStats(clientId, all);
  }, [pendingCommissions, historyCommissions, updateClientStats]);

  /**
   * Create new project with automatic ID generation and date assignment.
   * Immediately updates client analytics to reflect new business relationship.
   */
  const addPendingCommission = async (data: Omit<PendingCommission, 'id' | 'date'>) => {
    try {
      const newComm: PendingCommission = {
        ...data,
        id: PersistenceService.generateId(),
        date: new Date().toISOString().split('T')[0],
      };

      await PersistenceService.saveCommission(convertLocalToStorage(newComm));
      setPending(p => { 
        const next = [...p, newComm]; 
        setTimeout(()=>recomputeClientStats(newComm.client.id),0); 
        return next; 
      });
    } catch (e) {
      console.error('Error adding pending commission:', e);
    }
  };

  const updatePendingCommission = async (id: string, updates: Partial<PendingCommission>) => {
    try {
      setPending(prev => {
        const updated = prev.map(c => c.id===id? { ...c, ...updates }: c);
        const c = updated.find(c=>c.id===id);
        if (c) PersistenceService.saveCommission(convertLocalToStorage(c));
        return updated;
      });
    } catch(e){
      console.error('Error updating pending commission:', e);
    }
  };

  const deletePendingCommission = async (id: string) => {
    try {
      const comm = pendingCommissions.find(c=>c.id===id);
      await PersistenceService.deleteCommission(id, 'pending');
      setPending(p => p.filter(c => c.id!==id));
      if (comm) recomputeClientStats(comm.client.id);
    } catch(e){
      console.error('Error deleting pending commission:', e);
    }
  };

  const markCommissionComplete = async (id: string) => {
    try {
      console.log('markCommissionComplete called with id:', id);
      const commission = pendingCommissions.find(c => c.id === id);
      if (!commission) {
        console.log('Commission not found in pending list');
        return;
      }

      console.log('Found commission:', commission);
      console.log('Calling moveCommission...');
      await PersistenceService.moveCommission(id,'pending','completed');
      console.log('moveCommission completed successfully');

      const completed: HistoryCommission = {
        ...commission,
        status: 'Completed',
        originalDate: commission.date,
        completedDate: new Date().toISOString().split('T')[0]
      };

      setPending(p=>p.filter(c=>c.id!==id));
      setHistory(h=>{ const next=[...h, completed]; recomputeClientStats(commission.client.id); return next; });
      console.log('Commission moved to history successfully');
    } catch(e){
      console.error('Error marking complete:', e);
    }
  };

  const markCommissionInProgress = async (id: string) => {
    await updatePendingCommission(id, { status: 'In Progress' });
  };

  /**
   * Archive management: completed projects moved out of active workflow.
   * Maintains historical records for analytics while reducing active UI clutter.
   */
  const deleteHistoryCommission = async (id: string) => {
    try {
      const comm = historyCommissions.find(c=>c.id===id);
      await PersistenceService.deleteCommission(id,'completed');
      setHistory(h=>h.filter(c=>c.id!==id));
      if (comm) recomputeClientStats(comm.client.id);
    } catch(e){
      console.error('Error deleting history commission:', e);
    }
  };

  const moveToHistory = async (pending: PendingCommission) => {
    await markCommissionComplete(pending.id);
  };

  const markCommissionIncomplete = async (id: string) => {
    try {
      const commission = historyCommissions.find(c => c.id === id);
      if (!commission) return;

      await PersistenceService.moveCommission(id,'completed','pending');

      const pending: PendingCommission = {
        id: commission.id,
        client: commission.client,
        commType: commission.commType,
        price: commission.price,
        description: commission.description,
        refs: commission.refs,
        date: commission.originalDate,
        paymentStatus: commission.paymentStatus,
        status: 'Pending'
      };

      setHistory(h=>h.filter(c=>c.id!==id));
      setPending(p=>{ const next=[...p, pending]; recomputeClientStats(commission.client.id); return next; });
    } catch(e){
      console.error('Error marking incomplete:', e);
    }
  };

  const updateHistoryPaymentStatus = async (id: string, status: 'not-paid' | 'half-paid' | 'fully-paid') => {
    try {
      setHistory(prev => {
        const updated = prev.map(c=>c.id===id? { ...c, paymentStatus: status }: c);
        const target = updated.find(c=>c.id===id);
        if (target) { PersistenceService.saveCommission(convertLocalToStorage(target)); recomputeClientStats(target.client.id); }
        return updated;
      });
    } catch(e){
      console.error('Error updating history payment status:', e);
    }
  };

  // Payment Actions
  const updatePaymentStatus = async (id: string, status: 'not-paid' | 'half-paid' | 'fully-paid', isPending=true) => {
    if(isPending) { await updatePendingCommission(id, { paymentStatus: status }); const comm = pendingCommissions.find(c=>c.id===id); if (comm) recomputeClientStats(comm.client.id); } else { return updateHistoryPaymentStatus(id, status); }
  };

  // Pin Actions - Toggle pin status for commission prioritization
  const togglePin = async (id: string) => {
    const comm = pendingCommissions.find(c => c.id === id);
    if (comm) {
      await updatePendingCommission(id, { isPinned: !comm.isPinned });
    }
  };

  // Search and Filter
  const searchCommissions = (query: string, type: 'pending' | 'history'): PendingCommission[] | HistoryCommission[] => {
    const q = query.toLowerCase();
    if (type === 'pending') {
      return pendingCommissions.filter(c => c.client.name.toLowerCase().includes(q) || c.commType.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return historyCommissions.filter(c => c.client.name.toLowerCase().includes(q) || c.commType.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  };

  // Stats
  const getTotalEarnings = () => {
    const sum = (arr: (PendingCommission|HistoryCommission)[]) => arr.filter(c=>c.paymentStatus==='fully-paid').reduce((s,c)=>s+c.price,0);
    return sum(pendingCommissions)+sum(historyCommissions);
  };

  const getPendingEarnings = () => pendingCommissions.filter(c=>c.paymentStatus==='fully-paid').reduce((s,c)=>s+c.price,0);
  const getCompletedEarnings = () => historyCommissions.filter(c=>c.paymentStatus==='fully-paid').reduce((s,c)=>s+c.price,0);
  const getClientCommissions = (clientId: string) => ({ pending: pendingCommissions.filter(c=>c.client.id===clientId), history: historyCommissions.filter(c=>c.client.id===clientId) });

  return (
    <CommissionContext.Provider value={{
      pendingCommissions,
      historyCommissions,
      isLoading,
      addPendingCommission,
      updatePendingCommission,
      deletePendingCommission,
      markCommissionComplete,
      markCommissionInProgress,
      deleteHistoryCommission,
      moveToHistory,
      markCommissionIncomplete,
      updateHistoryPaymentStatus,
      updatePaymentStatus,
      togglePin,
      loadAllCommissions,
      searchCommissions,
      getTotalEarnings,
      getPendingEarnings,
      getCompletedEarnings,
      getClientCommissions
    }}>
      {children}
    </CommissionContext.Provider>
  );
};

export default CommissionContext;
