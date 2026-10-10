import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Plus, ReceiptText, UsersRound, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { getAllTeams, getRemainingBudget, type RemainingBudget, type TeamListItem } from '@/services/teams/teams';
import { getTeamTransactions, type TeamTransaction } from '@/services/teamActivity';

const money = (amount: number, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
const moneyByCurrency = (values: { amount: number; currency: string }[]) => {
  const totals = values.reduce<Record<string, number>>((result, value) => { result[value.currency] = (result[value.currency] ?? 0) + value.amount; return result; }, {});
  return Object.entries(totals).map(([currency, amount]) => money(amount, currency)).join(' · ') || money(0);
};
const transactionAmount = (transaction: TeamTransaction) => Number(transaction.ledgerEntries.find((entry) => entry.account.accountType === 'expense')?.debit ?? transaction.ledgerEntries[0]?.debit ?? 0);

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeOrganization, activeOrganizationId, loadingOrganizations } = useOrganization();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [budgets, setBudgets] = useState<Record<string, RemainingBudget>>({});
  const [transactions, setTransactions] = useState<{ item: TeamTransaction; teamName: string; currency: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeOrganizationId) { setTeams([]); setBudgets({}); setTransactions([]); return; }
    let cancelled = false;
    setLoading(true); setError('');
    void (async () => {
      try {
        const teamList = await getAllTeams(activeOrganizationId);
        const budgetResults = await Promise.all(teamList.filter((team) => team.budget).map(async (team) => [team.id, await getRemainingBudget(team.id)] as const));
        const activityResults = await Promise.all(teamList.map(async (team) => ({ teamName: team.name, currency: team.budget?.currency ?? 'INR', items: await getTeamTransactions(activeOrganizationId, team.id) })));
        if (cancelled) return;
        setTeams(teamList);
        setBudgets(Object.fromEntries(budgetResults));
        setTransactions(activityResults.flatMap((result) => result.items.map((item) => ({ item, teamName: result.teamName, currency: result.currency }))).sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt)));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load this organization overview.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [activeOrganizationId]);

  const budgetTotals = useMemo(() => Object.values(budgets), [budgets]);
  const budgetAllocated = moneyByCurrency(budgetTotals.map((budget) => ({ amount: budget.budget.total, currency: budget.budget.currency })));
  const members = activeOrganization?.memberCount ?? 0;

  if (loadingOrganizations) return <div className="page-wrap"><section className="panel org-home-empty"><p>Loading your workspace…</p></section></div>;
  if (!activeOrganization) return <div className="page-wrap"><section className="panel org-home-empty"><span className="modal-icon"><Building2 size={19}/></span><h1>Choose an organization</h1><p>Select an organization from the workspace menu to see its overview.</p><Link className="button button-primary" to="/"><Building2 size={16}/>View organizations</Link></section></div>;

  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> ORGANIZATION OVERVIEW</div><h1>{activeOrganization.name}</h1><p>A clear view of this organization's teams, budgets, and spending.</p></div><div className="heading-actions"><Link className="button button-secondary" to={`/organization/${activeOrganization.id}`}>Organization details <ArrowRight size={15}/></Link><Link className="button button-primary" to="/teams"><Plus size={17}/>Manage teams</Link></div></div>
    {error && <div className="form-note" role="alert">{error}</div>}
    <div className="metric-grid">
      <Metric title="Spent" value={moneyByCurrency(budgetTotals.map((budget) => ({ amount: budget.spending.spent, currency: budget.budget.currency })))} sub="Across team budgets" icon={<Wallet size={18}/>} />
      <Metric title="Budget remaining" value={moneyByCurrency(budgetTotals.map((budget) => ({ amount: budget.remaining, currency: budget.budget.currency })))} sub={`Of ${budgetAllocated} allocated`} icon={<Wallet size={18}/>} />
      <Metric title="Teams" value={String(teams.length)} sub="In this organization" icon={<UsersRound size={18}/>} />
      <Metric title="Members" value={String(members)} sub={user?.name ? `Including ${user.name.split(' ')[0]}` : 'Organization members'} icon={<Building2 size={18}/>} />
    </div>
    <div className="dashboard-grid org-dashboard-grid">
      <section className="panel budget-panel"><div className="panel-heading"><div><h2>Team budgets</h2><p>Remaining budget by team</p></div><Link to="/teams" className="text-link">View teams <ArrowRight size={14}/></Link></div>
        {loading ? <div className="org-dashboard-loading">Loading team budgets…</div> : teams.length ? <div className="budget-list">{teams.map((team, index) => { const budget = budgets[team.id]; const total = budget?.budget.total ?? Number(team.budget?.totalBudget ?? 0); const spent = budget?.spending.spent ?? 0; const percent = total ? Math.min(spent / total * 100, 100) : 0; return <div className="budget-item" key={team.id}><div className="budget-line"><span className="team-color-dot" data-tone={['violet', 'blue', 'orange', 'green'][index % 4]}/><strong>{team.name}</strong><span className="budget-amount">{team.budget ? `${money(budget?.remaining ?? 0, budget?.budget.currency ?? team.budget.currency)} left` : 'No budget set'}</span></div>{team.budget && <div className="progress-track"><span className={`progress-fill ${['violet', 'blue', 'orange', 'green'][index % 4]}`} style={{ width: `${percent}%` }}/></div>}<div className="org-team-caption">{team._count.members} {team._count.members === 1 ? 'member' : 'members'}{team.budget ? ` · ${money(spent, budget?.budget.currency ?? team.budget.currency)} spent of ${money(total, team.budget.currency)}` : ''}</div></div>; })}</div> : <div className="org-dashboard-loading">No teams in this organization yet.</div>}
      </section>
      <section className="panel budget-panel org-quick-panel"><div className="panel-heading"><div><h2>Organization</h2><p>Your current workspace</p></div><Building2 size={19}/></div><strong className="org-quick-name">{activeOrganization.name}</strong><div className="org-quick-meta"><span>{activeOrganization.role} access</span><span>{members} members</span><span>{teams.length} teams</span></div><Link to={`/organization/${activeOrganization.id}`} className="panel-footer-link">View organization details <ArrowRight size={15}/></Link></section>
    </div>
    <section className="panel transactions-panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Latest spending recorded by this organization's teams</p></div><Link to="/expenses" className="text-link">All transactions <ArrowRight size={14}/></Link></div>
      {loading ? <div className="org-dashboard-loading">Loading recent activity…</div> : transactions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>TRANSACTION</th><th>TEAM</th><th>PAID BY</th><th>DATE</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{transactions.slice(0, 6).map(({ item, teamName, currency: itemCurrency }) => <tr key={item.id}><td><div className="transaction-title"><span className="merchant-icon lavender"><ReceiptText size={16}/></span><div className="transaction-copy"><strong>{item.description || 'Team transaction'}</strong><small>{item.transactionType.replace(/_/g, ' ')}</small></div></div></td><td>{teamName}</td><td>{item.createdBy?.name ?? '—'}</td><td>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td className="align-right amount-cell">{item.transactionType === 'REIMBURSEMENT_REJECTION_REVERSAL' ? '+' : '−'}{money(transactionAmount(item), itemCurrency)}</td></tr>)}</tbody></table></div> : <div className="org-dashboard-loading"><ReceiptText size={18}/><span>No transactions have been recorded for this organization.</span></div>}
    </section>
    <div className="bottom-note"><span className="status-dot"/> Viewing {activeOrganization.name} <span>·</span> Data is scoped to this organization</div>
  </div>;
}

function Metric({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return <section className="panel metric-card"><div className="metric-top"><span>{title}</span><span className="metric-icon">{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-foot"><span>{sub}</span></div></section>;
}
