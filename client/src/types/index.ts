// Shared data shapes — these mirror the mock data and the future backend models.

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface SplitShare {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  teamId: string;
  description: string;
  amount: number;
  categoryId: string;
  paidBy: string;
  date: string; // ISO date string
  splitBetween: SplitShare[];
}

export interface Budget {
  id: string;
  teamId: string;
  categoryId: string;
  monthlyLimit: number;
}

export type InsightType = 'warning' | 'tip';

export interface Insight {
  id: string;
  text: string;
  type: InsightType;
}

export type SplitMethod = 'equal' | 'custom';
