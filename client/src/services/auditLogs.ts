import { apiClient } from '@/helper/commonHelper';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  action: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

export interface AuditLogPage {
  logs: AuditLogEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface AuditLogResponse { data: AuditLogPage; message: string }
export type AuditLogFilters = { page: number; limit: number; search?: string; entityType?: string; action?: string; from?: string; to?: string };

export async function getOrganizationAuditLogs(organizationId: string, filters: AuditLogFilters): Promise<AuditLogPage> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  const response = await apiClient.get<AuditLogResponse>(`/audit-logs/organization/${encodeURIComponent(organizationId)}?${query.toString()}`);
  if (response.error || !response.data) throw new Error(response.error || 'Could not load audit history.');
  return response.data.data;
}

