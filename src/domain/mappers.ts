import type { PaymentStatus, StorageClient, StorageCommission, DomainCommission } from './schemas';
import { DomainCommissionSchema, DomainClientSchema } from './schemas';

/**
 * Data mapping layer between storage format (Rust JSON) and domain format (React state).
 * Handles business logic transformations and backwards compatibility.
 */

// Payment status enum mapping between storage and domain representations
export function mapPaymentStatusStorageToDomain(s: StorageCommission['payment_status']): PaymentStatus {
  switch (s) {
    case 'Not Paid': return 'not-paid';
    case 'Half Paid': return 'half-paid';
    case 'Fully Paid': return 'fully-paid';
  }
}

export function mapPaymentStatusDomainToStorage(p: PaymentStatus): StorageCommission['payment_status'] {
  switch (p) {
    case 'not-paid': return 'Not Paid';
    case 'half-paid': return 'Half Paid';
    case 'fully-paid': return 'Fully Paid';
  }
}

// Client data transformation with UI-specific defaults
export function storageClientToDomain(c: StorageClient) {
  return DomainClientSchema.parse({
    id: c.id,
    name: c.name,
    contactInfo: c.email || c.contact,
    pfp: c.profile_image,
    totalCommissions: 0, // Calculated dynamically by context
    joinDate: c.created_at.split('T')[0],
    communicationPreference: 'Email', // Default preference
    notes: '' // UI-only field
  });
}

// Commission transformation with legacy price handling and status mapping
export function storageCommissionToDomain(c: StorageCommission) {
  try {
    // Backwards compatibility: convert legacy price to cents
    const rawPriceCents = (c as any).price_cents !== undefined 
      ? (c as any).price_cents 
      : Math.round(((c as any).price || 0) * 100);
    
    const priceCents = rawPriceCents;
    const paymentStatus = mapPaymentStatusStorageToDomain(c.payment_status);
    
    const base = { 
      id: c.id, 
      client: { 
        id: c.client_id, 
        name: c.client_name, 
        contactInfo: '', 
        pfp: undefined as string | undefined 
      }, 
      commType: c.title, 
      priceCents, 
      description: c.description, 
      refs: c.images.map((img, i) => ({ 
        name: `Image ${i+1}`, 
        url: img, 
        type: 'image' as const 
      })), 
      date: c.created_at.split('T')[0], 
      paymentStatus, 
      status: c.status === 'completed' ? 'Completed' : 
              c.status === 'in-progress' ? 'In Progress' : 'Pending', 
      originalDate: undefined as string | undefined, 
      completedDate: undefined as string | undefined 
    };
    
    // Completion date logic for workflow tracking
    if (c.status === 'completed') { 
      base.originalDate = base.date; 
      base.completedDate = c.updated_at.split('T')[0]; 
    }
    
    return DomainCommissionSchema.parse(base);
  } catch (e) {
    console.error('Failed to map commission, returning undefined', e);
    return undefined as any;
  }
}

// Reverse mapping for persistence operations
export function domainCommissionToStorage(c: DomainCommission): StorageCommission { 
  const price_cents = c.priceCents; 
  return { 
    id: c.id, 
    client_id: c.client.id, 
    client_name: c.client.name, 
    title: c.commType, 
    description: c.description, 
    price_cents, 
    payment_status: mapPaymentStatusDomainToStorage(c.paymentStatus), 
    status: c.status === 'Completed' ? 'completed' : 
            c.status === 'In Progress' ? 'in-progress' : 'pending', 
    created_at: c.date + 'T00:00:00.000Z', 
    updated_at: new Date().toISOString(), 
    images: c.refs.filter(r => r.type === 'image').map(r => r.url || r.name) 
  }; 
}
