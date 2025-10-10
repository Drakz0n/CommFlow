import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { PersistenceService } from '../services/PersistenceService';
import type { Client as StorageClient } from '../utils/dataStorage';

export interface Client {
  id: string;
  name: string;
  contactInfo: string; // Generic contact field to support multiple platforms
  pfp?: string;
  totalCommissions: number;
  joinDate: string;
  lastCommission?: string; // Calculated dynamically from commission data
  communicationPreference: 'Discord' | 'Email' | 'X (Twitter)' | 'Bluesky' | 'Instagram';
  notes: string;
}

interface ClientContextType {
  clients: Client[];
  isLoading: boolean;
  addClient: (client: Omit<Client, 'id' | 'totalCommissions' | 'joinDate' | 'lastCommission'>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  loadAllClients: () => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  updateClientStats: (clientId: string, commissions: any[]) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClients must be used within a ClientProvider');
  }
  return context;
};

interface ClientProviderProps { children: ReactNode; }

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Data transformation layer between storage format and UI format
  const convertStorageClient = (storageClient: StorageClient): Client => ({
    id: storageClient.id,
    name: storageClient.name,
    contactInfo: storageClient.email || storageClient.contact,
    pfp: storageClient.profile_image,
    totalCommissions: 0,
    joinDate: storageClient.created_at.split('T')[0],
    communicationPreference: 'Email' as const,
    notes: (storageClient as any).notes || ''
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const storageClients = await PersistenceService.getClients();
        setClients(storageClients.map(convertStorageClient));
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
      } finally { 
        setIsLoading(false); 
      }
    };
    loadClients();
  }, []);

  const addClient = async (clientData: Omit<Client, 'id' | 'totalCommissions' | 'joinDate' | 'lastCommission'>) => {
    try {
      const timestamp = PersistenceService.now();
      const storageClient: StorageClient = { 
        id: PersistenceService.generateId(), 
        name: clientData.name, 
        email: clientData.contactInfo, 
        contact: clientData.contactInfo, 
        profile_image: clientData.pfp, 
        created_at: timestamp, 
        updated_at: timestamp,
        notes: clientData.notes
      } as any;
      
      await PersistenceService.saveClient(storageClient);
      
      const newClient: Client = { 
        ...clientData, 
        id: storageClient.id, 
        totalCommissions: 0, 
        joinDate: new Date().toISOString().split('T')[0] 
      };
      
      setClients(prev => [...prev, newClient]);
    } catch (error) { 
      console.error('Error adding client:', error); 
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const existing = clients.find(c => c.id === id); 
      if (!existing) return;
      
      const storageClient: StorageClient = { 
        id, 
        name: updates.name || existing.name, 
        email: updates.contactInfo || existing.contactInfo, 
        contact: updates.contactInfo || existing.contactInfo, 
        profile_image: updates.pfp || existing.pfp, 
        created_at: existing.joinDate + 'T00:00:00.000Z', 
        updated_at: PersistenceService.now(),
        notes: updates.notes !== undefined ? updates.notes : existing.notes
      } as any;
      
      await PersistenceService.saveClient(storageClient);
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error) { 
      console.error('Error updating client:', error); 
    }
  };

  const deleteClient = async (id: string) => {
    try { 
      await PersistenceService.deleteClient(id); 
      setClients(prev => prev.filter(c => c.id !== id)); 
    } catch (error) { 
      console.error('Error deleting client:', error); 
    }
  };

  // Statistics are calculated from commission data and kept in sync automatically
  const updateClientStats = (clientId: string, commissions: any[]) => {
    setClients(prev => prev.map(client => {
      if (client.id !== clientId) return client;
      
      // Find the most recent commission date for display purposes
      const lastCommissionDate = commissions.length > 0 
        ? commissions.reduce((latest, comm) => {
            const commDate = comm.completedDate || comm.date;
            return commDate > latest ? commDate : latest;
          }, commissions[0].completedDate || commissions[0].date)
        : undefined;
      
      return { 
        ...client, 
        totalCommissions: commissions.length, 
        lastCommission: lastCommissionDate 
      };
    }));
  };

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const loadAllClients = useCallback(async () => {
    try { 
      setIsLoading(true); 
      const storageClients = await PersistenceService.getClients(); 
      setClients(storageClients.map(convertStorageClient)); 
    } catch (e) { 
      console.error('Error reloading clients:', e); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  return (
    <ClientContext.Provider value={{ 
      clients, 
      isLoading, 
      addClient, 
      updateClient, 
      deleteClient, 
      loadAllClients, 
      getClientById, 
      updateClientStats 
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export default ClientContext;
