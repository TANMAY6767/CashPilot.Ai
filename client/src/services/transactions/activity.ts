import { apiClient } from '@/helper/commonHelper';
import type { TeamTransaction } from '@/services/teamActivity';

export type ActivityType = 'all' | 'expense' | 'reimbursement' | 'other';
export type ReimbursementActivityStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'paid';

export interface OrganizationActivityRecord {
  id: string;
  recordType: 'transaction' | 'reimbursement_claim';
  organizationId: string;
  teamId: string;
  team: { id: string; name: string } | null;
  transactionType: string | null;
  description: string | null;
  referenceId: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | null;
  amount: string;
  currency: string;
  person: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt?: string;
  ledgerEntries: TeamTransaction['ledgerEntries'];
}

export interface ActivityQuery {
  teamId?: string;
  type?: ActivityType;
  status?: ReimbursementActivityStatus;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ActivityResponse {
  items: OrganizationActivityRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { transactions: number; reimbursementClaims: number; totalRecords: number };
  scope: { organizationId: string; teamId: string | null; accessibleTeamCount: number };
}

function queryString(query: ActivityQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '' && value !== 'all') params.set(key, String(value));
  }
  return params.size ? `?${params.toString()}` : '';
}

async function requestActivity(path: string, query: ActivityQuery): Promise<ActivityResponse> {
  const response = await apiClient.get<{ data: ActivityResponse }>(`${path}${queryString(query)}`);
  if (response.error || !response.data) throw new Error(response.error || 'Could not load organization activity.');
  return response.data.data;
}

export function getOrganizationActivity(orgId: string, query: ActivityQuery = {}) {
  return requestActivity(`/org/${encodeURIComponent(orgId)}/transactions`, query);
}

export function getTeamActivity(orgId: string, teamId: string, query: Omit<ActivityQuery, 'teamId'> = {}) {
  return requestActivity(`/org/${encodeURIComponent(orgId)}/teams/${encodeURIComponent(teamId)}/activity`, query);
}
