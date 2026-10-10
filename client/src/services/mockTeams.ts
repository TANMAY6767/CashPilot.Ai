/** Transaction records stay local until the transaction API is connected. */
export interface MockTransaction {
  id: string;
  teamId: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paidBy: string;
  note: string;
}

const transactionsKey = 'cashflow-team-transactions';

export function getMockTransactions(): MockTransaction[] {
  try {
    const stored = window.localStorage.getItem(transactionsKey);
    return stored ? JSON.parse(stored) as MockTransaction[] : [];
  } catch {
    return [];
  }
}

export function saveMockTransaction(transaction: MockTransaction) {
  const transactions = getMockTransactions();
  try { window.localStorage.setItem(transactionsKey, JSON.stringify([transaction, ...transactions])); } catch { /* Keep the current page usable if storage is disabled. */ }
}
