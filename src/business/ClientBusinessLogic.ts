import type { DomainClient } from '../domain/schemas';

/**
 * Pure business logic for client operations.
 * Handles client-related calculations and validation.
 */
export class ClientBusinessLogic {
  /**
   * Calculate client statistics
   */
  static calculateClientStats(
    commissions: { pending: any[], history: any[] }
  ) {
    const totalCommissions = commissions.pending.length + commissions.history.length;
    const completedCommissions = commissions.history.length;
    const pendingCommissions = commissions.pending.length;
    
    const totalRevenue = commissions.history
      .filter((c: any) => c.paymentStatus === 'fully-paid')
      .reduce((sum: number, c: any) => sum + c.price, 0);
    
    const pendingRevenue = commissions.pending
      .reduce((sum: number, c: any) => sum + c.price, 0);
    
    return {
      totalCommissions,
      completedCommissions,
      pendingCommissions,
      totalRevenue,
      pendingRevenue,
      averageCommissionValue: totalCommissions > 0 ? totalRevenue / totalCommissions : 0,
      completionRate: totalCommissions > 0 ? (completedCommissions / totalCommissions) * 100 : 0
    };
  }

  /**
   * Validate client data
   */
  static validateClientData(client: Partial<DomainClient>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!client.name?.trim()) {
      errors.push('Client name is required');
    }

    if (!client.contactInfo?.trim()) {
      errors.push('Contact information is required');
    }

    if (client.contactInfo && client.contactInfo.includes('@')) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(client.contactInfo)) {
        errors.push('Invalid email format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate client initials for avatar
   */
  static generateInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Determine client tier based on business metrics
   */
  static getClientTier(stats: ReturnType<typeof ClientBusinessLogic.calculateClientStats>): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
    if (stats.totalRevenue >= 5000) return 'Platinum';
    if (stats.totalRevenue >= 2000) return 'Gold';
    if (stats.totalRevenue >= 500) return 'Silver';
    return 'Bronze';
  }

  /**
   * Generate client ID
   */
  static generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format contact info for display
   */
  static formatContactInfo(contactInfo: string): { type: 'email' | 'phone' | 'other'; formatted: string } {
    if (contactInfo.includes('@')) {
      return { type: 'email', formatted: contactInfo };
    }
    
    // Simple phone number detection
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (phoneRegex.test(contactInfo)) {
      return { type: 'phone', formatted: contactInfo };
    }
    
    return { type: 'other', formatted: contactInfo };
  }
}
