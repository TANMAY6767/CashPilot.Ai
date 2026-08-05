import type {
  Budget,
  Category,
  Expense,
  Insight,
  Member,
  Team,
  User,
} from '@/types';

// Centralized mock data. When you wire up the real backend, delete this file
// (or keep it as a fixture for tests) and point the api.ts functions at your API.

export const mockCurrentUser: User = {
  id: 'u1',
  name: 'Alex Rivera',
  email: 'alex@example.com',
};

export const mockUsers: User[] = [mockCurrentUser];

export const mockMembers: Member[] = [
  { id: 'm1', name: 'Alex Rivera', email: 'alex@example.com' },
  { id: 'm2', name: 'Sam Patel', email: 'sam@example.com' },
  { id: 'm3', name: 'Jordan Lee', email: 'jordan@example.com' },
  { id: 'm4', name: 'Taylor Kim', email: 'taylor@example.com' },
];

export const mockTeams: Team[] = [
  {
    id: 't1',
    name: 'Apartment 4B',
    description: 'Shared rent, groceries, and utilities',
    memberIds: ['m1', 'm2', 'm3'],
  },
  {
    id: 't2',
    name: 'Trip to Lisbon',
    description: 'Spring break travel group',
    memberIds: ['m1', 'm4'],
  },
  {
    id: 't3',
    name: 'Office Lunch Club',
    description: 'Weekly team lunches',
    memberIds: ['m1', 'm2', 'm3', 'm4'],
  },
];

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Groceries' },
  { id: 'c2', name: 'Rent' },
  { id: 'c3', name: 'Utilities' },
  { id: 'c4', name: 'Travel' },
  { id: 'c5', name: 'Dining' },
  { id: 'c6', name: 'Entertainment' },
];

const now = new Date();
const iso = (daysAgo: number) =>
  new Date(now.getTime() - daysAgo * 86400000).toISOString();

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    teamId: 't1',
    description: 'Weekly grocery run',
    amount: 124.5,
    categoryId: 'c1',
    paidBy: 'm1',
    date: iso(1),
    splitBetween: [
      { memberId: 'm1', amount: 41.5 },
      { memberId: 'm2', amount: 41.5 },
      { memberId: 'm3', amount: 41.5 },
    ],
  },
  {
    id: 'e2',
    teamId: 't1',
    description: 'Electric bill',
    amount: 88.2,
    categoryId: 'c3',
    paidBy: 'm2',
    date: iso(3),
    splitBetween: [
      { memberId: 'm1', amount: 29.4 },
      { memberId: 'm2', amount: 29.4 },
      { memberId: 'm3', amount: 29.4 },
    ],
  },
  {
    id: 'e3',
    teamId: 't2',
    description: 'Flight to Lisbon',
    amount: 612.0,
    categoryId: 'c4',
    paidBy: 'm1',
    date: iso(6),
    splitBetween: [
      { memberId: 'm1', amount: 306.0 },
      { memberId: 'm4', amount: 306.0 },
    ],
  },
  {
    id: 'e4',
    teamId: 't3',
    description: 'Team lunch — sushi',
    amount: 64.75,
    categoryId: 'c5',
    paidBy: 'm4',
    date: iso(4),
    splitBetween: [
      { memberId: 'm1', amount: 16.19 },
      { memberId: 'm2', amount: 16.19 },
      { memberId: 'm3', amount: 16.19 },
      { memberId: 'm4', amount: 16.18 },
    ],
  },
  {
    id: 'e5',
    teamId: 't1',
    description: 'Movie night snacks',
    amount: 22.0,
    categoryId: 'c6',
    paidBy: 'm3',
    date: iso(8),
    splitBetween: [
      { memberId: 'm1', amount: 11.0 },
      { memberId: 'm3', amount: 11.0 },
    ],
  },
  {
    id: 'e6',
    teamId: 't2',
    description: 'Airbnb deposit',
    amount: 300.0,
    categoryId: 'c4',
    paidBy: 'm4',
    date: iso(10),
    splitBetween: [
      { memberId: 'm1', amount: 150.0 },
      { memberId: 'm4', amount: 150.0 },
    ],
  },
  {
    id: 'e7',
    teamId: 't3',
    description: 'Coffee run',
    amount: 18.4,
    categoryId: 'c5',
    paidBy: 'm2',
    date: iso(2),
    splitBetween: [
      { memberId: 'm1', amount: 9.2 },
      { memberId: 'm2', amount: 9.2 },
    ],
  },
  {
    id: 'e8',
    teamId: 't1',
    description: 'Monthly rent',
    amount: 2400.0,
    categoryId: 'c2',
    paidBy: 'm1',
    date: iso(12),
    splitBetween: [
      { memberId: 'm1', amount: 800.0 },
      { memberId: 'm2', amount: 800.0 },
      { memberId: 'm3', amount: 800.0 },
    ],
  },
];

export const mockBudgets: Budget[] = [
  { id: 'b1', teamId: 't1', categoryId: 'c1', monthlyLimit: 500 },
  { id: 'b2', teamId: 't1', categoryId: 'c2', monthlyLimit: 2500 },
  { id: 'b3', teamId: 't1', categoryId: 'c3', monthlyLimit: 150 },
  { id: 'b4', teamId: 't1', categoryId: 'c6', monthlyLimit: 80 },
  { id: 'b5', teamId: 't2', categoryId: 'c4', monthlyLimit: 1200 },
  { id: 'b6', teamId: 't3', categoryId: 'c5', monthlyLimit: 200 },
];

export const mockInsights: Insight[] = [
  {
    id: 'i1',
    text: 'You spent 20% more on Groceries this month compared to last month.',
    type: 'warning',
  },
  {
    id: 'i2',
    text: 'Your Travel budget is 76% used — on track to stay within the limit.',
    type: 'tip',
  },
  {
    id: 'i3',
    text: 'Dining out accounts for 3 of your last 8 expenses. Consider cooking one extra meal at home.',
    type: 'tip',
  },
];
