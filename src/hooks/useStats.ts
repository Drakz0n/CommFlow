import { useMemo } from 'react';
import { useCommissions } from '../contexts/CommissionContext';
import { useClients } from '../contexts/ClientContext';

export interface StatsData {
  // Commission workflow metrics
  totalCommissions: number;
  pendingCommissions: number;
  inProgressCommissions: number;
  completedCommissions: number;
  
  // Revenue tracking and forecasting
  totalEarnings: number;
  potentialEarnings: number; // Revenue pipeline from active work
  averageCommissionValue: number;
  unpaidCommissions: number;
  halfPaidCommissions: number;
  fullyPaidCommissions: number;
  
  // Client relationship metrics
  totalClients: number;
  activeClients: number; // Clients with ongoing work
  topClient: { name: string; earnings: number } | null;
  
  // Performance analytics
  thisMonthCommissions: number;
  thisMonthEarnings: number;
  lastCommissionDate: string | null;
  
  // Cash flow management
  totalUnpaidAmount: number;
  totalHalfPaidAmount: number;
  averageDaysToComplete: number;
}

/**
 * Comprehensive business metrics calculation.
 * Memoized to prevent expensive recalculations on every render.
 */
export const useStats = (): StatsData => {
  const { pendingCommissions, historyCommissions } = useCommissions();
  const { clients } = useClients();

  return useMemo(() => {
    const allCommissions = [...pendingCommissions, ...historyCommissions];
    
    // Workflow state distribution
    const totalCommissions = allCommissions.length;
    const pendingCount = pendingCommissions.filter(c => c.status === 'Pending').length;
    const inProgressCount = pendingCommissions.filter(c => c.status === 'In Progress').length;
    const completedCommissions = historyCommissions.length;
    
    // Revenue calculations - only count confirmed payments for accuracy
    const totalEarnings = historyCommissions
      .filter(c => c.paymentStatus === 'fully-paid')
      .reduce((sum, c) => sum + c.price, 0);
    
    const potentialEarnings = pendingCommissions.reduce((sum, c) => sum + c.price, 0);
    
    const averageCommissionValue = totalCommissions > 0 
      ? allCommissions.reduce((sum, c) => sum + c.price, 0) / totalCommissions 
      : 0;
    
    // Payment status distribution for cash flow visibility
    const unpaidCommissions = allCommissions.filter(c => c.paymentStatus === 'not-paid').length;
    const halfPaidCommissions = allCommissions.filter(c => c.paymentStatus === 'half-paid').length;
    const fullyPaidCommissions = allCommissions.filter(c => c.paymentStatus === 'fully-paid').length;
    
    // Outstanding payment amounts for collection prioritization
    const totalUnpaidAmount = allCommissions
      .filter(c => c.paymentStatus === 'not-paid')
      .reduce((sum, c) => sum + c.price, 0);
    
    const totalHalfPaidAmount = allCommissions
      .filter(c => c.paymentStatus === 'half-paid')
      .reduce((sum, c) => sum + (c.price / 2), 0);
    
    // Client engagement metrics
    const totalClients = clients.length;
    const activeClientIds = new Set(pendingCommissions.map(c => c.client.id));
    const activeClients = activeClientIds.size;
    
    // Revenue attribution by client for relationship prioritization
    const clientEarnings = new Map<string, { name: string; earnings: number }>();
    historyCommissions
      .filter(c => c.paymentStatus === 'fully-paid')
      .forEach(c => {
        const existing = clientEarnings.get(c.client.id) || { name: c.client.name, earnings: 0 };
        existing.earnings += c.price;
        clientEarnings.set(c.client.id, existing);
      });
    
    const topClient = clientEarnings.size > 0 
      ? Array.from(clientEarnings.values()).reduce((max, client) => 
          client.earnings > max.earnings ? client : max
        )
      : null;
    
    // Monthly performance tracking
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthCommissions = historyCommissions.filter(c => {
      const date = new Date(c.completedDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    const thisMonthEarnings = historyCommissions
      .filter(c => {
        const date = new Date(c.completedDate);
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear && 
               c.paymentStatus === 'fully-paid';
      })
      .reduce((sum, c) => sum + c.price, 0);
    
    // Recency tracking for client outreach timing
    const lastCommissionDate = historyCommissions.length > 0
      ? historyCommissions.reduce((latest, c) => 
          c.completedDate > latest ? c.completedDate : latest, 
          historyCommissions[0].completedDate
        )
      : null;
    
    // Performance benchmarking: delivery speed analysis
    const completedWithDays = historyCommissions.filter(c => c.originalDate && c.completedDate);
    const averageDaysToComplete = completedWithDays.length > 0
      ? completedWithDays.reduce((sum, c) => {
          const start = new Date(c.originalDate).getTime();
          const end = new Date(c.completedDate).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / completedWithDays.length
      : 0;

    return {
      totalCommissions,
      pendingCommissions: pendingCount,
      inProgressCommissions: inProgressCount,
      completedCommissions,
      totalEarnings,
      potentialEarnings,
      averageCommissionValue,
      unpaidCommissions,
      halfPaidCommissions,
      fullyPaidCommissions,
      totalClients,
      activeClients,
      topClient,
      thisMonthCommissions,
      thisMonthEarnings,
      lastCommissionDate,
      totalUnpaidAmount,
      totalHalfPaidAmount,
      averageDaysToComplete: Math.round(averageDaysToComplete)
    };
  }, [pendingCommissions, historyCommissions, clients]);
};
