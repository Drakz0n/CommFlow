import { PersistenceService } from '../services/PersistenceService';
import { domainCommissionToStorage } from '../domain/mappers';

/**
 * Development utility for creating realistic test data.
 * Manual-only execution prevents accidental data pollution in production.
 */
export async function seedExampleData() {
  const clients = [
    { name: 'Alice', contactInfo: 'alice@example.com' },
    { name: 'Bob', contactInfo: 'bob@example.com' },
    { name: 'Carol', contactInfo: 'carol@example.com' },
    { name: 'Dave', contactInfo: 'dave@example.com' }
  ];

  const clientIds: string[] = [];
  for (const c of clients) {
    const id = PersistenceService.generateId();
    await PersistenceService.saveClient({ 
      id, 
      name: c.name, 
      email: c.contactInfo, 
      contact: c.contactInfo, 
      profile_image: undefined, 
      created_at: PersistenceService.now(), 
      updated_at: PersistenceService.now() 
    });
    clientIds.push(id);
  }

  /**
   * Create realistic commission scenarios for testing workflow states.
   * Covers different payment statuses and timeframes for comprehensive testing.
   */
  const mk = (clientIndex: number, price: number, status: 'Pending' | 'In Progress' | 'Completed', payment: 'not-paid' | 'half-paid' | 'fully-paid', offsetDays: number) => {
    const id = PersistenceService.generateId();
    const date = new Date(Date.now() - offsetDays*86400000).toISOString().split('T')[0];
    return { 
      id, 
      client: { 
        id: clientIds[clientIndex], 
        name: clients[clientIndex].name, 
        contactInfo: clients[clientIndex].contactInfo 
      }, 
      commType: 'Art', 
      priceCents: Math.round(price*100), 
      description: 'Test commission', 
      refs: [], 
      date, 
      paymentStatus: payment, 
      status, 
      originalDate: status==='Completed'? date: undefined, 
      completedDate: status==='Completed'? date: undefined 
    };
  };

  const pending = [
    mk(0, 50, 'Pending', 'not-paid', 1),
    mk(1, 75, 'In Progress', 'half-paid', 2), // Test "In Progress" persistence
    mk(2, 100,'Pending', 'fully-paid', 3),
    mk(3, 30, 'In Progress', 'not-paid', 4), // Test "In Progress" persistence
    mk(0, 60, 'Pending', 'half-paid', 5),
  ];

  const completed = Array.from({length:10}).map((_,i)=> mk(i%4, 40 + i*5, 'Completed', i%3===0? 'fully-paid': (i%3===1?'half-paid':'not-paid'), 6 + i));

  for (const c of pending) { 
    await PersistenceService.saveCommission(domainCommissionToStorage(c)); 
  }
  for (const c of completed) { 
    await PersistenceService.saveCommission(domainCommissionToStorage(c)); 
  }

  console.log('Seeded example data. Reload the app to view.');
}
