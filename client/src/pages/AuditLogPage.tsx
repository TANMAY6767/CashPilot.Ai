import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, ChevronLeft, ChevronRight, Clock3, FileClock, RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { getOrganizationAuditLogs, type AuditLogEntry, type AuditLogFilters } from '@/services/auditLogs';

const entityLabels: Record<string, string> = {
  organization: 'Organization', team: 'Team', team_member: 'Team member', organization_member: 'Organization member',
  organization_invitation: 'Invitation', team_invitation: 'Team invitation', budget: 'Budget', account: 'Account',
  transaction: 'Transaction', reimbursement_claim: 'Reimbursement',
};
const titleCase = (value: string | null) => (value || 'Activity').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const valueText = (value: unknown) => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function AuditLogPage() {
  const { activeOrganization, activeOrganizationId, loadingOrganizations } = useOrganization();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [refreshSequence, setRefreshSequence] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filters = useMemo<AuditLogFilters>(() => ({ page: pagination.page, limit: pagination.limit, search: search.trim() || undefined, entityType: entityType || undefined, action: action || undefined, from: from || undefined, to: to || undefined }), [pagination.limit, pagination.page, search, entityType, action, from, to]);
  const loadLogs = useCallback(async (organizationId: string, requestFilters: AuditLogFilters) => {
    setLoading(true);
    try {
      const result = await getOrganizationAuditLogs(organizationId, requestFilters);
      setLogs(result.logs);
      setPagination(result.pagination);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load audit history.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) { setLogs([]); setLoading(false); return; }
    const timer = window.setTimeout(() => { void loadLogs(activeOrganizationId, filters); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [activeOrganizationId, filters, loadLogs, refreshSequence, search]);

  const changeFilter = (update: () => void) => { update(); setPagination((current) => ({ ...current, page: 1 })); };

  const exportCsv = async () => {
    if (!activeOrganizationId || !pagination.total || exporting) return;
    setExporting(true);
    try {
      const allLogs: AuditLogEntry[] = [];
      const totalPages = Math.max(1, Math.ceil(pagination.total / 100));
      for (let page = 1; page <= totalPages; page += 1) {
        const result = await getOrganizationAuditLogs(activeOrganizationId, { ...filters, page, limit: 100 });
        allLogs.push(...result.logs);
      }
      const rows = [['Date', 'Actor', 'Email', 'Action', 'Entity type', 'Entity ID', 'Old value', 'New value'], ...allLogs.map((log) => [log.createdAt, log.user?.name ?? 'System', log.user?.email ?? '', log.action, log.entityType, log.entityId, valueText(log.oldValue), valueText(log.newValue)])];
      const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${activeOrganization?.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'organization'}-audit-log.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not export the audit log.'); }
    finally { setExporting(false); }
  };

  if (loadingOrganizations) return <div className="page-wrap"><section className="panel org-home-empty"><p>Loading your workspace…</p></section></div>;
  if (!activeOrganization) return <div className="page-wrap"><section className="panel org-home-empty"><span className="modal-icon"><FileClock size={19}/></span><h1>Choose an organization</h1><p>Select an organization to view its audit history.</p><Link className="button button-primary" to="/">View organizations</Link></section></div>;

  return <div className="page-wrap audit-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> {activeOrganization.name}</div><h1>Audit log</h1><p>A searchable record of changes made across this organization.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => setRefreshSequence((current) => current + 1)} disabled={loading}><RefreshCw size={15}/>{loading ? 'Refreshing…' : 'Refresh'}</button><button className="button button-secondary" onClick={() => void exportCsv()} disabled={!pagination.total || exporting}><ArrowDownToLine size={15}/>{exporting ? 'Preparing CSV…' : 'Export CSV'}</button></div></div>
    {error && <div className="form-note" role="alert">{error}</div>}
    <section className="panel audit-panel">
      <div className="audit-panel-heading"><div><span className="audit-panel-icon"><FileClock size={17}/></span><div><h2>Activity history</h2><p>{loading ? 'Updating entries…' : `${pagination.total.toLocaleString()} ${pagination.total === 1 ? 'entry' : 'entries'} in this organization`}</p></div></div><span className="audit-scope"><Clock3 size={14}/>Newest first</span></div>
      <div className="audit-filters">
        <label className="search-field audit-search"><Search size={16}/><input aria-label="Search audit history" value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} placeholder="Search actor, action, or ID"/></label>
        <select className="filter-select" aria-label="Filter entity type" value={entityType} onChange={(event) => changeFilter(() => setEntityType(event.target.value))}><option value="">All entity types</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="filter-select" aria-label="Filter action" value={action} onChange={(event) => changeFilter(() => setAction(event.target.value))}><option value="">All actions</option><option value="create">Created</option><option value="update">Updated</option><option value="delete">Deleted</option></select>
        <label className="audit-date-label"><span>From</span><input type="date" aria-label="Start date" value={from} onChange={(event) => changeFilter(() => setFrom(event.target.value))}/></label>
        <label className="audit-date-label"><span>To</span><input type="date" aria-label="End date" value={to} onChange={(event) => changeFilter(() => setTo(event.target.value))}/></label>
        {(search || entityType || action || from || to) && <button className="audit-clear" onClick={() => { setSearch(''); setEntityType(''); setAction(''); setFrom(''); setTo(''); setPagination((current) => ({ ...current, page: 1 })); }}><X size={14}/>Clear</button>}
      </div>
      <div className="table-scroll"><table className="data-table audit-table"><thead><tr><th>ACTIVITY</th><th>ACTOR</th><th>ENTITY</th><th>DATE &amp; TIME</th><th>REFERENCE</th></tr></thead><tbody>
        {logs.map((log) => <tr key={log.id} onClick={() => setSelectedLog(log)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedLog(log); }}><td><div className="audit-activity-cell"><span className={`audit-action-icon action-${log.action || 'other'}`}><Activity size={15}/></span><span><strong>{titleCase(log.action)} {entityLabels[log.entityType || '']?.toLowerCase() ?? 'activity'}</strong><small>{log.entityType ? entityLabels[log.entityType] ?? titleCase(log.entityType) : 'System activity'}</small></span></div></td><td><div className="audit-actor"><span className="audit-avatar">{log.user?.name?.trim().slice(0, 1).toUpperCase() ?? 'S'}</span><span><strong>{log.user?.name ?? 'System'}</strong><small>{log.user?.email ?? 'Automated action'}</small></span></div></td><td><span className="audit-entity-pill">{entityLabels[log.entityType || ''] ?? titleCase(log.entityType)}</span></td><td><span className="audit-date">{new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><small className="audit-time">{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></td><td><code className="audit-id">{log.entityId || '—'}</code></td></tr>)}
      </tbody></table>
        {!loading && logs.length === 0 && <div className="empty-state"><span><Search size={20}/></span><strong>{pagination.total ? 'No entries on this page' : 'No audit entries yet'}</strong><p>{pagination.total ? 'Try another page or adjust your filters.' : 'Changes made by organization members will appear here.'}</p></div>}
      </div>
      <div className="audit-pagination"><span>Showing <strong>{pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of <strong>{pagination.total}</strong></span><div><button className="button button-secondary" onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={loading || pagination.page <= 1}><ChevronLeft size={15}/>Previous</button><span>Page {pagination.page} of {Math.max(1, pagination.totalPages)}</span><button className="button button-secondary" onClick={() => setPagination((current) => ({ ...current, page: Math.min(Math.max(current.totalPages, 1), current.page + 1) }))} disabled={loading || pagination.page >= pagination.totalPages}>Next<ChevronRight size={15}/></button></div></div>
    </section>

    {selectedLog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}><section className="modal-card audit-detail-modal" role="dialog" aria-modal="true" aria-label="Audit entry details"><div className="modal-heading"><div><span className="modal-icon"><Activity size={18}/></span><h2>{titleCase(selectedLog.action)} {entityLabels[selectedLog.entityType || '']?.toLowerCase() ?? 'activity'}</h2><p>{new Date(selectedLog.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><button className="icon-button" onClick={() => setSelectedLog(null)} aria-label="Close details"><X size={19}/></button></div>
      <dl className="audit-detail-meta"><div><dt>Actor</dt><dd>{selectedLog.user?.name ?? 'System'}{selectedLog.user?.email ? ` · ${selectedLog.user.email}` : ''}</dd></div><div><dt>Entity</dt><dd>{entityLabels[selectedLog.entityType || ''] ?? titleCase(selectedLog.entityType)}</dd></div><div><dt>Entity ID</dt><dd><code>{selectedLog.entityId || '—'}</code></dd></div><div><dt>Audit entry ID</dt><dd><code>{selectedLog.id}</code></dd></div></dl>
      <div className="audit-json-grid"><section><h3>Before</h3><pre>{valueText(selectedLog.oldValue)}</pre></section><section><h3>After</h3><pre>{valueText(selectedLog.newValue)}</pre></section></div><div className="modal-actions"><button className="button button-secondary" onClick={() => setSelectedLog(null)}>Close</button></div>
    </section></div>}
  </div>;
}
