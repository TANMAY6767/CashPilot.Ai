// =============================================================================
// API SERVICE — THE BACKEND SEAM
// -----------------------------------------------------------------------------
// Every place in the app that *would* call your backend goes through this file.
// Each function is async and returns mock/dummy data for now. When you wire up
// your real Node.js/Express + SQL backend, replace the bodies of these
// functions with real fetch/axios calls — the rest of the app won't change.
//
// Suggested real implementation:
//   const BASE = import.meta.env.VITE_API_URL;
//   export async function getTeams() {
//     const res = await fetch(`${BASE}/teams`, { headers: authHeader() });
//     if (!res.ok) throw new Error('Failed to load teams');
//     return res.json();
//   }
// =============================================================================

import type {
  Budget,
  Category,
  Expense,
  Insight,
  Member,
  SplitMethod,
  Team,
  User,
} from '@/types';
import {
  mockBudgets,
  mockCategories,
  mockCurrentUser,
  mockExpenses,
  mockInsights,
  mockMembers,
  mockTeams,
} from './mockData';

// Simulate network latency so the UI's loading states are exercised.
const delay = <T>(value: T, ms = 250): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// ---------------------------------------------------------------------------
// Auth — structure this so a JWT can drop in later. For now it just validates
// against the mock user and stashes a fake token string.
// ---------------------------------------------------------------------------

export interface AuthResult {
  user: User;
  token: string; // placeholder for a real JWT
}

export async function login(email: string, _password: string): Promise<AuthResult> {
  // TODO: POST /auth/login -> { user, token }
  return delay({ user: { ...mockCurrentUser, email }, token: 'mock-jwt-token' });
}

export async function signup(
  name: string,
  email: string,
  _password: string,
): Promise<AuthResult> {
  // TODO: POST /auth/signup -> { user, token }
  return delay({
    user: { id: 'u1', name, email },
    token: 'mock-jwt-token',
  });
}

export async function getCurrentUser(): Promise<User> {
  // TODO: GET /auth/me (with Authorization: Bearer <token>)
  return delay(mockCurrentUser);
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function getTeams(): Promise<Team[]> {
  // TODO: GET /teams
  return delay(mockTeams);
}

export async function getTeam(teamId: string): Promise<Team | undefined> {
  // TODO: GET /teams/:id
  return delay(mockTeams.find((t) => t.id === teamId));
}

export async function createTeam(
  name: string,
  description: string,
): Promise<Team> {
  // TODO: POST /teams
  const team: Team = {
    id: `t${Date.now()}`,
    name,
    description,
    memberIds: [mockCurrentUser.id],
  };
  return delay(team);
}

export async function inviteMember(
  _teamId: string,
  email: string,
): Promise<Member> {
  // TODO: POST /teams/:id/invite
  const member: Member = {
    id: `m${Date.now()}`,
    name: email.split('@')[0],
    email,
  };
  return delay(member);
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function getMembers(): Promise<Member[]> {
  // TODO: GET /members
  return delay(mockMembers);
}

export async function getMembersForTeam(teamId: string): Promise<Member[]> {
  // TODO: GET /teams/:id/members
  const team = mockTeams.find((t) => t.id === teamId);
  const ids = team?.memberIds ?? [];
  return delay(mockMembers.filter((m) => ids.includes(m.id)));
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  // TODO: GET /categories
  return delay(mockCategories);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function getExpenses(): Promise<Expense[]> {
  // TODO: GET /expenses
  return delay(mockExpenses);
}

export async function getExpensesForTeam(teamId: string): Promise<Expense[]> {
  // TODO: GET /teams/:id/expenses
  return delay(mockExpenses.filter((e) => e.teamId === teamId));
}

export async function getRecentExpenses(limit = 5): Promise<Expense[]> {
  // TODO: GET /expenses?limit=5&sort=desc
  const sorted = [...mockExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return delay(sorted.slice(0, limit));
}

export interface NewExpenseInput {
  teamId: string;
  description: string;
  amount: number;
  categoryId: string;
  paidBy: string;
  date: string;
  splitMethod: SplitMethod;
  splitBetween: { memberId: string; amount?: number }[];
}

export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  // TODO: POST /expenses
  const total = input.amount;
  const splitBetween =
    input.splitMethod === 'equal'
      ? input.splitBetween.map((s) => ({
          memberId: s.memberId,
          amount: Math.round((total / input.splitBetween.length) * 100) / 100,
        }))
      : input.splitBetween.map((s) => ({
          memberId: s.memberId,
          amount: s.amount ?? 0,
        }));

  const expense: Expense = {
    id: `e${Date.now()}`,
    teamId: input.teamId,
    description: input.description,
    amount: input.amount,
    categoryId: input.categoryId,
    paidBy: input.paidBy,
    date: input.date,
    splitBetween,
  };
  return delay(expense);
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

export async function getBudgets(): Promise<Budget[]> {
  // TODO: GET /budgets
  return delay(mockBudgets);
}

export async function getBudgetsForTeam(teamId: string): Promise<Budget[]> {
  // TODO: GET /teams/:id/budgets
  return delay(mockBudgets.filter((b) => b.teamId === teamId));
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'ok' | 'near' | 'over';
}

export async function getBudgetStatus(teamId?: string): Promise<BudgetStatus[]> {
  // TODO: GET /budgets/status?teamId=...
  const budgets = teamId
    ? mockBudgets.filter((b) => b.teamId === teamId)
    : mockBudgets;
  const statuses: BudgetStatus[] = budgets.map((budget) => {
    const spent = mockExpenses
      .filter((e) => e.categoryId === budget.categoryId && e.teamId === budget.teamId)
      .reduce((sum, e) => sum + e.amount, 0);
    const remaining = budget.monthlyLimit - spent;
    const percentUsed = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
    const status: BudgetStatus['status'] =
      percentUsed >= 100 ? 'over' : percentUsed >= 90 ? 'near' : 'ok';
    return { budget, spent, remaining, percentUsed, status };
  });
  return delay(statuses);
}

export async function upsertBudget(
  teamId: string,
  categoryId: string,
  monthlyLimit: number,
): Promise<Budget> {
  // TODO: PUT /budgets
  const existing = mockBudgets.find(
    (b) => b.teamId === teamId && b.categoryId === categoryId,
  );
  const budget: Budget = existing
    ? { ...existing, monthlyLimit }
    : { id: `b${Date.now()}`, teamId, categoryId, monthlyLimit };
  return delay(budget);
}

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  totalSpentThisMonth: number;
  budgetRemaining: number;
  activeTeamCount: number;
  spendByCategory: { categoryId: string; categoryName: string; amount: number }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  // TODO: GET /dashboard/summary
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thisMonth = mockExpenses.filter(
    (e) => new Date(e.date) >= startOfMonth,
  );
  const totalSpentThisMonth = thisMonth.reduce((s, e) => s + e.amount, 0);

  const totalBudget = mockBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpentAll = mockExpenses.reduce((s, e) => s + e.amount, 0);
  const budgetRemaining = Math.max(totalBudget - totalSpentAll, 0);

  const spendByCategory = mockCategories.map((c) => ({
    categoryId: c.id,
    categoryName: c.name,
    amount: thisMonth
      .filter((e) => e.categoryId === c.id)
      .reduce((s, e) => s + e.amount, 0),
  }));

  return delay({
    totalSpentThisMonth,
    budgetRemaining,
    activeTeamCount: mockTeams.length,
    spendByCategory,
  });
}

// ---------------------------------------------------------------------------
// Insights (GenAI panel) — placeholder, no real AI call yet.
// ---------------------------------------------------------------------------

export async function getInsights(): Promise<Insight[]> {
  // TODO: GET /insights (or POST /insights/generate)
  return delay(mockInsights);
}

export async function sendInsightChat(_message: string): Promise<Insight> {
  // TODO: POST /insights/chat -> streamed/generated insight
  return delay({
    id: `i${Date.now()}`,
    text: 'This is a placeholder AI response. Wire up your model endpoint here.',
    type: 'tip',
  });
}
