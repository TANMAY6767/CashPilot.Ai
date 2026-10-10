import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Plus, ReceiptText, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganization } from '@/context/OrganizationContext';
import { getAllTeams, type TeamListItem } from '@/services/teams/teams';
import { createTeamExpenseTransaction, getTeamTransactions, type TeamTransaction } from '@/services/teamActivity';

type Row = { item: TeamTransaction; team: TeamListItem };
const amountOf = (item: TeamTransaction) => Number(item.ledgerEntries.find((entry) => entry.account.accountType === 'expense')?.debit ?? item.ledgerEntries[0]?.debit ?? 0);
const money = (amount: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
const moneyByCurrency = (values: { amount: number; currency: string }[]) => {
  const totals = values.reduce<Record<string, number>>((result, value) => { result[value.currency] = (result[value.currency] ?? 0) + value.amount; return result; }, {});
  return Object.entries(totals).map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0, 'INR');
};

export default function TransactionPage() {
  const { activeOrganization, activeOrganizationId, loadingOrganizations } = useOrganization();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const loadTransactions = async (orgId: string) => {
    const teamList = await getAllTeams(orgId);
    const results = await Promise.all(teamList.map(async (team) => ({ team, transactions: await getTeamTransactions(orgId, team.id) })));
    setTeams(teamList);
    setRows(results.flatMap(({ team, transactions }) => transactions.map((item) => ({ item, team }))).sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt)));
    setSelectedTeam((current) => teamList.some((team) => team.id === current) ? current : teamList[0]?.id ?? '');
  };

  useEffect(() => {
    if (!activeOrganizationId) { setRows([]); setTeams([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    void loadTransactions(activeOrganizationId).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load transactions.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeOrganizationId]);

  const filtered = useMemo(() => rows.filter(({ item, team }) => {
    const text = `${item.description ?? ''} ${team.name} ${item.createdBy?.name ?? ''} ${item.transactionType}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (teamFilter === 'all' || team.id === teamFilter);
  }), [rows, search, teamFilter]);
  const total = moneyByCurrency(filtered.map(({ item, team }) => ({ amount: amountOf(item), currency: team.budget?.currency ?? 'INR' })));
  const currency = teams.find((team) => team.id === selectedTeam)?.budget?.currency ?? 'INR';

  const createTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrganizationId || !selectedTeam || saving) return;
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setError('Enter an amount greater than zero.'); return; }
    try {
      setSaving(true); setError('');
      await createTeamExpenseTransaction(activeOrganizationId, selectedTeam, { amount: parsedAmount, description: description.trim() });
      await loadTransactions(activeOrganizationId);
      setShowForm(false); setDescription(''); setAmount('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not record this transaction.'); }
    finally { setSaving(false); }
  };

  if (loadingOrganizations) return <div className="page-wrap"><section className="panel org-home-empty"><p>Loading your workspace…</p></section></div>;
  if (!activeOrganization) return <div className="page-wrap"><section className="panel org-home-empty"><span className="modal-icon"><ReceiptText size={19}/></span><h1>Choose an organization</h1><p>Select an organization from the workspace menu to view its transactions.</p><Link className="button button-primary" to="/">View organizations <ArrowRight size={15}/></Link></section></div>;

  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> {activeOrganization.name}</div><h1>Transactions</h1><p>Review spending recorded by this organization's teams.</p></div><button className="button button-primary" onClick={() => { setError(''); setShowForm(true); }} disabled={!teams.length}><Plus size={17}/>Record expense</button></div>
    {error && <div className="form-note" role="alert">{error}</div>}
    <div className="transaction-stats"><div className="panel transaction-stat"><span className="metric-icon"><ReceiptText size={18}/></span><span className="subtle-label">VISIBLE SPEND</span><strong>{total}</strong><small>Across {teamFilter === 'all' ? 'all teams' : 'the selected team'}</small></div><div className="panel transaction-stat"><span className="metric-icon"><ReceiptText size={18}/></span><span className="subtle-label">TRANSACTIONS</span><strong>{filtered.length}</strong><small>In {activeOrganization.name}</small></div><div className="panel transaction-stat"><span className="metric-icon"><ReceiptText size={18}/></span><span className="subtle-label">TEAMS</span><strong>{teamFilter === 'all' ? teams.length : 1}</strong><small>Available in this organization</small></div></div>
    <section className="panel transactions-panel ledger-panel"><div className="ledger-toolbar"><div><h2>Organization transactions</h2><p>{loading ? 'Loading activity…' : `Showing ${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'} · ${total}`}</p></div><div className="ledger-controls"><label className="search-field"><Search size={16}/><input aria-label="Search transactions" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transactions"/></label><select className="filter-select" aria-label="Filter by team" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}><option value="all">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div></div>
      <div className="table-scroll"><table className="data-table transaction-table"><thead><tr><th>TRANSACTION</th><th>TEAM</th><th>RECORDED BY</th><th>DATE</th><th>TYPE</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{filtered.map(({ item, team }) => { const itemCurrency = team.budget?.currency ?? currency; return <tr key={item.id}><td><div className="transaction-title"><span className="merchant-icon lavender"><ReceiptText size={16}/></span><span className="transaction-copy"><strong>{item.description || 'Team transaction'}</strong><small>{item.id}</small></span></div></td><td>{team.name}</td><td>{item.createdBy?.name ?? '—'}</td><td>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><span className="category-pill">{item.transactionType.replace(/_/g, ' ')}</span></td><td className="align-right amount-cell">{item.transactionType === 'REIMBURSEMENT_REJECTION_REVERSAL' ? '+' : '−'}{money(amountOf(item), itemCurrency)}</td></tr>; })}</tbody></table>
        {!loading && filtered.length === 0 && <div className="empty-state"><span><Search size={20}/></span><strong>{rows.length ? 'No transactions found' : 'No transactions yet'}</strong><p>{rows.length ? 'Try a different search or team.' : `Expenses recorded by ${activeOrganization.name} teams will appear here.`}</p></div>}
      </div><div className="table-pagination"><span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> organization transactions</span><span className="transaction-scope-note">Only {activeOrganization.name} is included</span></div></section>
    {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowForm(false); }}><form className="modal-card" onSubmit={(event) => void createTransaction(event)}><div className="modal-heading"><div><span className="modal-icon"><ReceiptText size={18}/></span><h2>Record a team expense</h2><p>This expense will be recorded in {activeOrganization.name}.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close" disabled={saving}><X size={19}/></button></div>
      <label className="form-label">Team<select required value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <div className="form-two-col"><label className="form-label">Amount<div className="input-with-prefix"><span>{currency}</span><input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00"/></div></label><label className="form-label">Description<input required maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this expense for?"/></label></div>
      {error && <div className="form-note" role="alert">{error}</div>}<div className="form-note"><ReceiptText size={16}/> The expense will be deducted from the selected team's budget.</div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving || !teams.length}><Plus size={16}/>{saving ? 'Saving…' : 'Save expense'}</button></div></form></div>}
  </div>;
}
