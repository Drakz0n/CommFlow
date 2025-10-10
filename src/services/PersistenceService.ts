import { DataStorage } from '../utils/dataStorage';
import type { Client as StorageClient, Commission as StorageCommission } from '../utils/dataStorage';
import { StorageClientSchema, StorageCommissionSchema } from '../domain/schemas';

/**
 * Unified persistence abstraction layer.
 * Allows swapping DataStorage implementation without touching context files.
 */
export class PersistenceService {
  // Client persistence methods
  static async getClients(): Promise<StorageClient[]> { 
    const raw = await DataStorage.loadAllClients(); 
    return raw.map((r) => { 
      try { 
        const parsed = StorageClientSchema.parse(r); 
        return { 
          ...parsed, 
          email: parsed.email || '', 
          contact: parsed.contact || parsed.email || '',
          profile_image: parsed.profile_image || undefined
        }; 
      } catch (e) { 
        // Data migration: coerce malformed legacy data rather than crash
        console.warn('Coercing client (schema validation failed):', e, r); 
        return { 
          id: r.id || DataStorage.generateId(), 
          name: r.name || 'Unnamed', 
          email: r.email || r.contact || '', 
          contact: r.contact || r.email || '', 
          profile_image: r.profile_image || undefined, 
          created_at: r.created_at || new Date().toISOString(), 
          updated_at: r.updated_at || new Date().toISOString() 
        }; 
      } 
    }); 
  }

  static async saveClient(client: StorageClient): Promise<void> {
    const parsed = StorageClientSchema.parse(client as any);
    return DataStorage.saveClient({ 
      ...parsed, 
      email: parsed.email || '',
      profile_image: parsed.profile_image || undefined
    });
  }

  static async deleteClient(clientId: string): Promise<void> {
    return DataStorage.deleteClient(clientId);
  }

  // Commission persistence methods
  static async getCommissions(status: 'pending' | 'completed'): Promise<StorageCommission[]> { 
    const raw = await DataStorage.loadCommissions(status); 
    return raw.map(r => { 
      const result = StorageCommissionSchema.safeParse(r); 
      if (!result.success) { 
        console.error('Invalid commission skipped', result.error, r); 
        return null as any; 
      } 
      return result.data as any; 
    }).filter(Boolean); 
  }

  static async saveCommission(commission: StorageCommission): Promise<void> { 
    StorageCommissionSchema.parse(commission as any); 
    return DataStorage.saveCommission(commission as any); 
  }

  static async moveCommission(id: string, fromStatus: 'pending' | 'completed', toStatus: 'pending' | 'completed'): Promise<void> {
    return DataStorage.moveCommission(id, fromStatus, toStatus);
  }

  static async deleteCommission(id: string, status: 'pending' | 'completed'): Promise<void> {
    return DataStorage.deleteCommission(id, status);
  }

  // Utility methods (re-exported for convenience)
  static generateId(): string { return DataStorage.generateId(); }
  static now(): string { return DataStorage.getCurrentTimestamp(); }
}
