import type { PendingCommission, HistoryCommission } from '../contexts/CommissionContext';

/**
 * Pure business logic for commission operations.
 * No side effects, just business rules and calculations.
 */
export class CommissionBusinessLogic {
  /**
   * Calculate total earnings from commissions
   */
  static calculateTotalEarnings(commissions: (PendingCommission | HistoryCommission)[]): number {
    return commissions
      .filter(c => c.paymentStatus === 'fully-paid')
      .reduce((sum, c) => sum + c.price, 0);
  }

  /**
   * Calculate pending earnings (work done but not paid)
   */
  static calculatePendingEarnings(commissions: (PendingCommission | HistoryCommission)[]): number {
    return commissions
      .filter(c => c.paymentStatus !== 'fully-paid')
      .reduce((sum, c) => sum + c.price, 0);
  }

  /**
   * Calculate completed earnings
   */
  static calculateCompletedEarnings(commissions: HistoryCommission[]): number {
    return commissions
      .filter(c => c.paymentStatus === 'fully-paid')
      .reduce((sum, c) => sum + c.price, 0);
  }

  /**
   * Filter commissions by search query
   */
  static searchCommissions(
    commissions: (PendingCommission | HistoryCommission)[],
    query: string
  ): (PendingCommission | HistoryCommission)[] {
    if (!query.trim()) return commissions;
    
    const lowerQuery = query.toLowerCase();
    return commissions.filter(commission =>
      commission.client.name.toLowerCase().includes(lowerQuery) ||
      commission.commType.toLowerCase().includes(lowerQuery) ||
      commission.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get commissions for a specific client
   */
  static getClientCommissions(
    clientId: string,
    pendingCommissions: PendingCommission[],
    historyCommissions: HistoryCommission[]
  ): { pending: PendingCommission[], history: HistoryCommission[] } {
    return {
      pending: pendingCommissions.filter(c => c.client.id === clientId),
      history: historyCommissions.filter(c => c.client.id === clientId)
    };
  }

  /**
   * Validate commission status transition
   */
  static validateStatusTransition(
    from: 'Pending' | 'In Progress' | 'Completed',
    to: 'Pending' | 'In Progress' | 'Completed'
  ): boolean {
    const validTransitions = {
      'Pending': ['In Progress'],
      'In Progress': ['Completed'],
      'Completed': ['Pending'] // Allow marking incomplete
    };
    
    return validTransitions[from]?.includes(to) || from === to;
  }

  /**
   * Calculate commission statistics for analytics
   */
  static calculateCommissionStats(commissions: (PendingCommission | HistoryCommission)[]) {
    const total = commissions.length;
    const completed = commissions.filter(c => c.status === 'Completed').length;
    const inProgress = commissions.filter(c => c.status === 'In Progress').length;
    const pending = commissions.filter(c => c.status === 'Pending').length;
    
    const totalRevenue = this.calculateTotalEarnings(commissions);
    const averagePrice = total > 0 ? totalRevenue / total : 0;
    
    return {
      total,
      completed,
      inProgress,
      pending,
      totalRevenue,
      averagePrice,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }

  /**
   * Generate commission ID
   */
  static generateCommissionId(): string {
    return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create new commission object with defaults
   */
  static createNewCommission(
    data: Omit<PendingCommission, 'id' | 'date'>
  ): PendingCommission {
    return {
      ...data,
      id: this.generateCommissionId(),
      date: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Convert pending commission to history commission
   */
  static convertToHistoryCommission(pending: PendingCommission): HistoryCommission {
    return {
      ...pending,
      status: 'Completed' as const,
      originalDate: pending.date,
      completedDate: new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Convert history commission back to pending
   */
  static convertToPendingCommission(history: HistoryCommission): PendingCommission {
    return {
      id: history.id,
      client: history.client,
      commType: history.commType,
      price: history.price,
      description: history.description,
      refs: history.refs,
      date: history.originalDate || history.date,
      paymentStatus: history.paymentStatus,
      status: 'Pending' as const
    };
  }
}
