import { invoke } from '@tauri-apps/api/core';
import { 
  validateId, 
  validateName, 
  validateEmail, 
  validateContact, 
  validateDescription,
  validateStatus,
  validatePaymentStatus,
  validatePriceCents
} from './validation';

export interface Client {
  id: string;
  name: string;
  email: string;
  contact: string;
  profile_image?: string;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  description: string;
  price_cents?: number; // Financial calculations require integer cents to avoid floating-point errors
  price?: number; // Legacy field maintained for backward compatibility during migration
  payment_status: 'Not Paid' | 'Half Paid' | 'Fully Paid';
  status: 'pending' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
  images: string[]; // File paths relative to data directory for portability
}

/**
 * Tauri-based storage layer abstraction.
 * All file operations are handled by Rust backend for security and performance.
 */
export class DataStorage {
  // Client CRUD operations
  static async saveClient(client: Client): Promise<void> {
    // Frontend validation before sending to backend
    validateId(client.id);
    validateName(client.name, 'Client name');
    validateEmail(client.email);
    validateContact(client.contact);
    
    return invoke('save_client', { client });
  }

  static async loadClient(clientId: string): Promise<Client | null> {
    validateId(clientId);
    return invoke('load_client', { clientId: clientId });
  }

  static async loadAllClients(): Promise<Client[]> {
    return invoke('load_all_clients');
  }

  static async deleteClient(clientId: string): Promise<void> {
    validateId(clientId);
    return invoke('delete_client', { clientId: clientId });
  }

  // Commission CRUD operations
  static async saveCommission(commission: Commission): Promise<void> {
    // Frontend validation before sending to backend
    validateId(commission.id);
    validateId(commission.client_id);
    validateName(commission.client_name, 'Client name');
    validateName(commission.title, 'Commission title');
    validateDescription(commission.description);
    if (commission.price_cents !== undefined) {
      validatePriceCents(commission.price_cents);
    }
    validatePaymentStatus(commission.payment_status);
    validateStatus(commission.status);
    
    return invoke('save_commission', { commission });
  }

  static async loadCommissions(status: 'pending' | 'completed'): Promise<Commission[]> {
    validateStatus(status);
    return invoke('load_commissions', { status });
  }

  static async deleteCommission(commissionId: string, status: 'pending' | 'completed'): Promise<void> {
    validateId(commissionId);
    validateStatus(status);
    return invoke('delete_commission', { commissionId: commissionId, status });
  }

  // Status transition management for commission workflow
  static async moveCommission(
    commissionId: string, 
    fromStatus: 'pending' | 'completed', 
    toStatus: 'pending' | 'completed'
  ): Promise<void> {
    // Frontend validation before sending to backend
    validateId(commissionId);
    validateStatus(fromStatus);
    validateStatus(toStatus);
    
    console.log('DataStorage.moveCommission called:', { commissionId, fromStatus, toStatus });
    try {
      await invoke('move_commission', { 
        commissionId: commissionId, 
        fromStatus: fromStatus, 
        toStatus: toStatus 
      });
      console.log('DataStorage.moveCommission completed successfully');
    } catch (error) {
      console.error('DataStorage.moveCommission failed:', error);
      throw error;
    }
  }

  // File system operations for commission assets
  static async saveCommissionImage(
    commissionId: string,
    clientName: string,
    imageData: Uint8Array,
    filename: string
  ): Promise<string> {
    return invoke('save_commission_image', {
      commissionId: commissionId,
      clientName: clientName,
      imageData: Array.from(imageData), // Convert to array for Tauri serialization
      filename
    });
  }

  // System integration utilities
  static async getDataDirectory(): Promise<string> {
    return invoke('get_data_directory_path');
  }

  // Backup and restore functionality
  static async exportAllData(): Promise<string> {
    return invoke('export_all_data');
  }

  static async importData(importPath: string): Promise<void> {
    return invoke('import_data', { importPath: importPath });
  }

  // Client-side ID generation for offline-first workflow
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }
}
