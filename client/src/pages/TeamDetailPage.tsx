import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, CalendarDays, Check, CircleDollarSign, Plus, ReceiptText, ShieldCheck, UsersRound, WalletCards } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getAllOrgs, getOrg, type Organization, type OrganizationDetail } from '@/services/oraganizations/org.services';
import { addTeamMember, getAllTeams, getOneTeam, getRemainingBudget, removeTeamMember, updateTeamMemberRole, type RemainingBudget, type TeamDetail, type TeamListItem } from '@/services/teams/teams';
import { getMockTransactions, saveMockTransaction, type MockTransaction } from '@/services/mockTeams';

const money = (amount: number, currency: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
const initials = (name: string) => name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function TeamDetailPage() {
  const { teamId = '' } = useParams();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [organizationDetail, setOrganizationDetail] = useState<OrganizationDetail | null>(null);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [remainingBudget, setRemainingBudget] = useState<RemainingBudget | null>(null);
  const [transactions, setTransactions] = useState<MockTransaction[]>(getMockTransactions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remainingError, setRemainingError] = useState('');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<'member' | 'admin'>('member');
  const [memberError, setMemberError] = useState('');
  const [memberSaving, setMemberSaving] = useState(false);

  const loadDetail = useCallback(async (orgId: string) => {
    const result = await getOneTeam(orgId, teamId);
    if (!result) throw new Error('Team not found.');
    setDetail(result);
    if (result.budget) {
      try { setRemainingBudget(await getRemainingBudget(teamId)); setRemainingError(''); }
      catch (cause) { setRemainingBudget(null); setRemainingError(cause instanceof Error ? cause.message : 'Could not load remaining budget.'); }
    } else { setRemainingBudget(null); setRemainingError(''); }
    const org = await getOrg(orgId);
    setOrganizationDetail(org);
  }, [teamId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true); setError('');
        setDetail(null); setOrganizationDetail(null); setRemainingBudget(null);
        const available = await getAllOrgs();
        const orgs = available ?? [];
        const matching = await Promise.all(orgs.map(async (org) => ({ org, teams: await getAllTeams(org.id) })));
        const match = matching.find((item) => item.teams.some((team) => team.id === teamId));
        if (!match) { if (!cancelled) setOrganizations(orgs); return; }
        const listItem: TeamListItem | undefined = match.teams.find((team) => team.id === teamId);
        const orgIsOwner = match.org.role === 'owner';
        const hasTeamAccess = Boolean(listItem && (orgIsOwner || listItem.createdById === user?.id || listItem.members.length > 0));
        if (!hasTeamAccess) { if (!cancelled) setOrganizations(orgs); return; }
        if (!cancelled) {
          setOrganizations(orgs); setOrganizationId(match.org.id);
          await loadDetail(match.org.id);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load this team.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [teamId, user?.id, loadDetail]);

  const teamTransactions = useMemo(() => transactions.filter((transaction) => transaction.teamId === teamId).sort((a, b) => b.date.localeCompare(a.date)), [teamId, transactions]);
  if (!loading && !detail && !error) return <Navigate to="/teams" replace />;
  if (!detail) return <div className="page-wrap">{error ? <div className="form-note" role="alert">{error}</div> : <section className="panel team-empty-state"><p>{loading ? 'Loading team…' : 'Team unavailable.'}</p></section>}</div>;

  const budgetAmount = Number(detail.budget?.totalBudget ?? 0);
  const spent = remainingBudget?.spending.spent ?? 0;
  const left = remainingBudget?.remaining;
  const percentUsed = budgetAmount ? Math.round((spent / budgetAmount) * 100) : 0;
  const myMembership = detail.members.find((member) => member.userId === user?.id);
  const isOrganizationOwner = organizationDetail?.members.some((member) => member.userId === user?.id && member.role === 'owner') ?? false;
  const access = isOrganizationOwner ? 'Organization owner' : myMembership?.role === 'admin' ? 'Team admin' : myMembership?.role === 'owner' ? 'Team owner' : 'Team member';
  const canManageMembers = detail.createdById === user?.id;
  const eligibleMembers = organizationDetail?.members.filter((member) => !detail.members.some((teamMember) => teamMember.userId === member.userId)) ?? [];

  const submitTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(''); setSaved(false);
    const parsedAmount = Number(amount);
    if (!title.trim()) { setFormError('Add a transaction name.'); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setFormError('Enter an amount greater than zero.'); return; }
    const transaction: MockTransaction = { id: `local-${Date.now()}`, teamId, title: title.trim(), category, amount: parsedAmount, date, paidBy: user?.name || 'You', note: note.trim() };
    saveMockTransaction(transaction); setTransactions((current) => [transaction, ...current]);
    setTitle(''); setAmount(''); setNote(''); setCategory('Software'); setDate(today()); setShowTransactionForm(false); setSaved(true);
  };

  const addMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!memberUserId || memberSaving) return;
    setMemberSaving(true); setMemberError('');
    try { await addTeamMember(teamId, memberUserId, memberRole); await loadDetail(organizationId); setMemberUserId(''); }
    catch (cause) { setMemberError(cause instanceof Error ? cause.message : 'Could not add this member.'); }
    finally { setMemberSaving(false); }
  };

  const changeMemberRole = async (userId: string, role: 'member' | 'admin') => {
    setMemberError('');
    try { await updateTeamMemberRole(teamId, userId, role); await loadDetail(organizationId); }
    catch (cause) { setMemberError(cause instanceof Error ? cause.message : 'Could not update this role.'); }
  };

  const removeMember = async (member: TeamDetail['members'][number]) => {
    if (!window.confirm(`Remove ${member.user.name} from this team?`)) return;
    setMemberError('');
    try { await removeTeamMember(teamId, member.userId); await loadDetail(organizationId); }
    catch (cause) { setMemberError(cause instanceof Error ? cause.message : 'Could not remove this member.'); }
  };

  return <div className="page-wrap team-detail-page">
    <Link to="/teams" className="back-link"><ArrowLeft size={15}/> All teams</Link>
    <section className="team-detail-hero panel">
      <div className="team-detail-identity"><div className="team-avatar tone-violet team-avatar-large">{initials(detail.name)}</div><div><div className="eyebrow"><span className="eyebrow-dot"/> {detail.organization.name.toUpperCase()}</div><h1>{detail.name}</h1><p>Team budget, membership, and spending activity.</p></div></div>
      <div className="team-detail-actions"><span className="team-access-chip"><ShieldCheck size={14}/>{access}</span><button type="button" className="button button-primary" onClick={() => { setSaved(false); setShowTransactionForm((visible) => !visible); }}><CircleDollarSign size={16}/>Record transaction</button></div>
      <div className="team-detail-meta"><span><CalendarDays size={15}/> Created {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span><UsersRound size={15}/>{detail.members.length} team members</span><span><ReceiptText size={15}/>{teamTransactions.length} local transactions</span></div>
    </section>

    {saved && <div className="team-success-note" role="status"><Check size={16}/> Transaction saved in this browser. Budget remaining is calculated by the backend budget controller.</div>}
    {error && <div className="form-note team-page-error" role="alert">{error}</div>}

    {showTransactionForm && <form className="panel team-transaction-form" onSubmit={submitTransaction}>
      <div className="team-form-heading"><div><h2>Record a team transaction</h2><p>Saved locally until transaction backend support is connected.</p></div><button type="button" className="icon-button" onClick={() => setShowTransactionForm(false)} aria-label="Close form">×</button></div>
      <div className="team-form-grid"><label className="form-label">Transaction name<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Monthly software subscription"/></label><label className="form-label">Amount ({detail.budget?.currency ?? 'INR'})<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00"/></label><label className="form-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Software</option><option>Travel</option><option>Meals</option><option>Office</option><option>Marketing</option><option>Research</option><option>Other</option></select></label><label className="form-label">Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label><label className="form-label team-note-field">Note <span className="field-hint">Optional details for the team</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a short note"/></label></div>
      {formError && <p className="team-form-error" role="alert">{formError}</p>}<div className="team-form-footer"><span>Paid by {user?.name || 'You'}</span><button type="button" className="button button-secondary" onClick={() => setShowTransactionForm(false)}>Cancel</button><button type="submit" className="button button-primary">Save transaction</button></div>
    </form>}

    <section className="team-budget-detail panel">
      <div className="team-budget-detail-head"><div><span className="subtle-label">TEAM BUDGET</span><h2>{detail.budget ? money(budgetAmount, detail.budget.currency) : 'No budget set'}</h2></div><span className="team-budget-icon"><WalletCards size={20}/></span></div>
      {detail.budget ? <><div className="team-budget-numbers"><div><span>Spent</span><strong>{remainingBudget ? money(spent, remainingBudget.budget.currency) : remainingError ? 'Unavailable' : 'Loading…'}</strong></div><div><span>Remaining</span><strong className={left !== undefined && left < 0 ? 'budget-over' : ''}>{left === undefined ? remainingError ? 'Unavailable' : 'Loading…' : money(left, remainingBudget?.budget.currency ?? detail.budget.currency)}</strong></div><div><span>Budget used</span><strong>{remainingBudget ? `${percentUsed}%` : '—'}</strong></div></div><div className="team-budget-track team-budget-track-large"><span style={{ width: `${Math.min(percentUsed, 100)}%` }}/></div><div className="team-budget-caption">{remainingBudget ? left! >= 0 ? `${money(left!, remainingBudget.budget.currency)} remaining` : `${money(Math.abs(left!), remainingBudget.budget.currency)} over budget` : remainingError || 'Loading budget balance…'}</div></> : <p className="team-budget-caption">The team owner can set a budget from the teams page.</p>}
    </section>

    <div className="team-detail-columns">
      <section className="panel team-member-detail"><div className="panel-heading"><div><h2>Team members</h2><p>People with access to this team.</p></div><span className="inline-count">{detail.members.length}</span></div>
        {canManageMembers && <form className="team-add-member-form" onSubmit={(event) => void addMember(event)}><select aria-label="Choose organization member" value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)}><option value="">Add an organization member…</option>{eligibleMembers.map((member) => <option key={member.userId} value={member.userId}>{member.user.name} · {member.user.email}</option>)}</select><select aria-label="New team role" value={memberRole} onChange={(event) => setMemberRole(event.target.value as 'member' | 'admin')}><option value="member">Member</option><option value="admin">Admin</option></select><button className="button button-secondary" type="submit" disabled={!memberUserId || memberSaving}><Plus size={14}/>{memberSaving ? 'Adding…' : 'Add'}</button></form>}
        {memberError && <div className="form-note team-member-error" role="alert">{memberError}</div>}
        <div className="team-member-list">{detail.members.map((member) => <div className="team-member-row" key={member.id}><span className="avatar avatar-small avatar-indigo">{initials(member.user.name)}</span><div className="team-member-copy"><strong>{member.user.name}{member.userId === user?.id && <span className="you-label">You</span>}</strong><span>{member.user.email}</span></div>{canManageMembers && member.userId !== detail.createdById ? <div className="team-member-actions"><select aria-label={`Role for ${member.user.name}`} value={member.role} onChange={(event) => void changeMemberRole(member.userId, event.target.value as 'member' | 'admin')}><option value="member">Member</option><option value="admin">Admin</option></select><button className="edit-budget-button team-delete-action" onClick={() => void removeMember(member)}>Remove</button></div> : <span className={`team-role-pill role-${member.role}`}>{member.role === 'owner' ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}</span>}</div>)}</div>
      </section>

      <section className="panel team-about-panel"><div className="panel-heading"><div><h2>Team details</h2><p>About this team and its access.</p></div></div><dl className="team-about-list"><div><dt>Organization</dt><dd>{detail.organization.name}</dd></div><div><dt>Your access</dt><dd>{access}</dd></div><div><dt>Team owner</dt><dd>{detail.createdBy.name}</dd></div><div><dt>Created</dt><dd>{new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div><div><dt>Spend calculation</dt><dd>Ledger based</dd></div></dl></section>
    </div>

    <section className="panel team-transactions-panel"><div className="team-transactions-heading"><div><h2>Team transactions</h2><p>Transactions recorded locally for this team.</p></div><span className="inline-count">{teamTransactions.length}</span></div>
      {teamTransactions.length ? <div className="table-scroll"><table className="data-table team-transactions-table"><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>PAID BY</th><th>DATE</th><th className="amount-cell">AMOUNT</th></tr></thead><tbody>{teamTransactions.map((transaction) => <tr key={transaction.id}><td><div className="transaction-copy"><strong>{transaction.title}</strong>{transaction.note && <small>{transaction.note}</small>}</div></td><td><span className="team-category-chip">{transaction.category}</span></td><td>{transaction.paidBy}</td><td>{new Date(`${transaction.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="amount-cell">−{money(transaction.amount, detail.budget?.currency ?? 'INR')}</td></tr>)}</tbody></table></div> : <div className="team-empty-transactions"><ReceiptText size={19}/><strong>No local transactions yet</strong><span>Record a transaction to start the team activity list.</span></div>}
    </section>
  </div>;
}
