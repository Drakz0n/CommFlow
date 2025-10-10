import { z } from 'zod';

// Business domain enums with consistent validation
export const PaymentStatusEnum = z.enum(['not-paid','half-paid','fully-paid']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export const WorkStatusEnum = z.enum(['pending','in-progress','completed']);
export type WorkStatus = z.infer<typeof WorkStatusEnum>;

/**
 * Storage layer schemas for Rust backend persistence.
 * These match the exact JSON structure saved to disk.
 */
export const StorageClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional().or(z.literal('')).catch(''), // Legacy migration support
  contact: z.string(),
  profile_image: z.string().optional().nullable().catch(undefined), // Allow null and convert to undefined
  notes: z.string().optional().catch(''), // Notes field for client information
  created_at: z.string(),
  updated_at: z.string(),
});
export type StorageClient = z.infer<typeof StorageClientSchema>;

export const StorageCommissionSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client_name: z.string(),
  title: z.string(),
  description: z.string().default(''),
  price: z.number().optional(), // Legacy field for migration compatibility
  price_cents: z.number().int().optional(), // Preferred field to avoid floating-point errors
  payment_status: z.enum(['Not Paid','Half Paid','Fully Paid']),
  status: z.enum(['pending','in-progress','completed']),
  created_at: z.string(),
  updated_at: z.string(),
  images: z.array(z.string()).default([])
}).refine(d => d.price !== undefined || d.price_cents !== undefined, { 
  message: 'price or price_cents required' 
});
export type StorageCommission = z.infer<typeof StorageCommissionSchema>;

/**
 * Domain layer schemas for UI components.
 * These represent the business logic structure, optimized for React state management.
 */
export const DomainClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactInfo: z.string(),
  pfp: z.string().optional(),
  totalCommissions: z.number().int().nonnegative(),
  joinDate: z.string(),
  lastCommission: z.string().optional(),
  communicationPreference: z.string(),
  notes: z.string(),
});
export type DomainClient = z.infer<typeof DomainClientSchema>;

export const DomainCommissionSchema = z.object({
  id: z.string(),
  client: z.object({ 
    id: z.string(), 
    name: z.string(), 
    contactInfo: z.string(), 
    pfp: z.string().optional() 
  }),
  commType: z.string(),
  priceCents: z.number().int().nonnegative(), // Integer cents prevent currency precision errors
  description: z.string(),
  refs: z.array(z.object({ 
    name: z.string(), 
    url: z.string().optional(), 
    type: z.enum(['image','text']) 
  })),
  date: z.string(),
  paymentStatus: PaymentStatusEnum,
  status: z.enum(['Pending','In Progress','Completed']),
  originalDate: z.string().optional(),
  completedDate: z.string().optional()
});
export type DomainCommission = z.infer<typeof DomainCommissionSchema>;

// Safe array parsing utility for handling corrupted or invalid data gracefully
export function validateArray<T>(schema: z.ZodType<T>, data: unknown): T[] { 
  const parsed = z.array(schema).safeParse(data); 
  if (parsed.success) return parsed.data; 
  return []; 
}
