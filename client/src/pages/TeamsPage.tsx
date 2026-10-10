import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Plus, Search, ShieldCheck, UsersRound, WalletCards, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getAllOrgs, getOrg, type Organization, type OrganizationDetail } from '@/services/oraganizations/org.services';
import { createTeam, createTeamBudget, deleteTeam, getAllTeams, getRemainingBudget, updateTeam, updateTeamBudget, type RemainingBudget, type TeamListItem } from '@/services/teams/teams';

type ModalMode = 'create' | 'rename' | 'budget';
const money = (amount: number | string, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount) || 0);
const initials = (name: string) => name.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function TeamsPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [organizationDetail, setOrganizationDetail] = useState<OrganizationDetail | null>(null);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [remaining, setRemaining] = useState<Record<string, RemainingBudget>>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamListItem | null>(null);
  const [teamName, setTeamName] = useState('');
  const [budgetValue, setBudgetValue] = useState('');
  const [currency, setCurrency] = useState('INR');

  const organization = organizations.find((item) => item.id === organizationId) ?? null;
  const isOrganizationOwner = organization?.role === 'owner';
  const visibleTeams = useMemo(() => teams.filter((team) => {
    const hasAccess = isOrganizationOwner || team.createdById === user?.id || team.members.length > 0;
    return hasAccess && team.name.toLowerCase().includes(query.toLowerCase());
  }), [teams, query, isOrganizationOwner, user?.id]);

  const loadTeams = useCallback(async (orgId: string) => {
    if (!orgId) { setTeams([]); setRemaining({}); setOrganizationDetail(null); return; }
    const [teamResults, orgDetail] = await Promise.all([getAllTeams(orgId), getOrg(orgId)]);
    setTeams(teamResults);
    setOrganizationDetail(orgDetail);
    const budgetResults = await Promise.allSettled(teamResults.filter((team) => team.budget).map((team) => getRemainingBudget(team.id)));
    const nextRemaining: Record<string, RemainingBudget> = {};
    budgetResults.forEach((result, index) => { if (result.status === 'fulfilled') nextRemaining[teamResults.filter((team) => team.budget)[index].id] = result.value; });
    setRemaining(nextRemaining);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOrganizations = async () => {
      try {
        setLoading(true); setError('');
        const result = await getAllOrgs();
        if (cancelled) return;
        const available = result ?? [];
        setOrganizations(available);
        setOrganizationId((current) => available.some((org) => org.id === current) ? current : available[0]?.id ?? '');
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load organizations.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void loadOrganizations();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!organizationId) { setTeams([]); setOrganizationDetail(null); return; }
    let cancelled = false;
    setLoading(true); setError('');
    void loadTeams(organizationId).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load teams.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId, loadTeams]);

  const openModal = (mode: ModalMode, team: TeamListItem | null = null) => {
    setError(''); setSelectedTeam(team); setTeamName(team?.name ?? '');
    setBudgetValue(team?.budget?.totalBudget ?? ''); setCurrency(team?.budget?.currency ?? 'INR'); setModal(mode);
  };

  const refresh = async () => { if (organizationId) await loadTeams(organizationId); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!organizationId || saving) return;
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        if (budgetValue.trim() && (!Number.isFinite(Number(budgetValue)) || Number(budgetValue) <= 0)) {
          throw new Error('Enter a valid budget greater than zero.');
        }
        const created = await createTeam(organizationId, { name: teamName.trim() });
        if (!created) throw new Error('Could not create team.');
        if (budgetValue.trim()) {
          try { await createTeamBudget(created.id, Number(budgetValue), currency); }
          catch (cause) {
            await refresh();
            throw new Error(`Team created, but its budget could not be saved: ${cause instanceof Error ? cause.message : 'Please try again.'}`);
          }
        }
      } else if (modal === 'rename' && selectedTeam) {
        await updateTeam(organizationId, selectedTeam.id, teamName.trim());
      } else if (modal === 'budget' && selectedTeam) {
        const amount = Number(budgetValue);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a budget greater than zero.');
        if (selectedTeam.budget) await updateTeamBudget(selectedTeam.id, amount, currency);
        else await createTeamBudget(selectedTeam.id, amount, currency);
      }
      await refresh(); setModal(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this change.'); }
    finally { setSaving(false); }
  };

  const removeTeam = async (team: TeamListItem) => {
    if (!organizationId || !window.confirm(`Delete ${team.name}? This will remove its team data.`)) return;
    setError('');
    try { await deleteTeam(organizationId, team.id); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete team.'); }
  };

  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> ORGANIZATION</div><h1>Teams &amp; budgets</h1><p>Organize your people and keep team spending on track.</p></div><button className="button button-primary" onClick={() => openModal('create')} disabled={!organizationId}><Plus size={16}/>Create team</button></div>

    <div className="team-workspace panel"><div className="workspace-avatar">{organization ? initials(organization.name).slice(0, 1) : '?'}</div><div><span className="subtle-label">CURRENT ORGANIZATION</span>{organizations.length > 1 ? <select className="team-organization-select" aria-label="Select organization" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : <strong>{organization?.name ?? (loading ? 'Loading organizations…' : 'No organization')}</strong>}</div><span className="team-workspace-meta">{visibleTeams.length} {visibleTeams.length === 1 ? 'team' : 'teams'} available</span></div>

    {error && <div className="form-note team-page-error" role="alert">{error}</div>}
    {!loading && !organizations.length && <section className="panel team-empty-state"><span><UsersRound size={20}/></span><h2>No organizations found</h2><p>Join an organization to view or create its teams.</p></section>}

    {organization && <>
      <div className="team-list-toolbar"><div><h2>{isOrganizationOwner ? 'All teams' : 'Your teams'} <span className="inline-count">{visibleTeams.length}</span></h2><p>{isOrganizationOwner ? 'As organization owner, you can see every team.' : 'You can see teams where you are a member or admin.'}</p></div><label className="search-field"><Search size={16}/><input aria-label="Search teams" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams"/></label></div>
      {loading ? <section className="panel team-empty-state"><p>Loading teams…</p></section> : visibleTeams.length ? <div className="team-grid">
        {visibleTeams.map((team, index) => {
          const budgetSummary = remaining[team.id];
          const isCreator = team.createdById === user?.id;
          const total = Number(team.budget?.totalBudget ?? 0);
          const spent = budgetSummary?.spending.spent ?? 0;
          const left = budgetSummary?.remaining;
          return <article className="panel team-card team-card-modern" key={team.id}>
            <div className="team-card-top"><div className={`team-avatar tone-${['violet', 'blue', 'green', 'orange'][index % 4]}`}>{initials(team.name)}</div><span className="team-access-chip"><ShieldCheck size={13}/>{isOrganizationOwner ? 'Owner access' : team.members[0]?.role ?? 'Member'}</span></div>
            <h3>{team.name}</h3><p className="team-description">{organizationDetail?.name ?? organization?.name} team</p>
            <div className="team-card-stats"><span><UsersRound size={15}/>{team._count.members} {team._count.members === 1 ? 'member' : 'members'}</span><span><WalletCards size={15}/>{team.budget ? 'Budget set' : 'No budget'}</span></div>
            <div className="team-budget-overview"><div><span>Budget</span><strong>{team.budget ? money(total, team.budget.currency) : 'Not set'}</strong></div><div><span>Remaining</span><strong className={left !== undefined && left < 0 ? 'budget-over' : ''}>{team.budget ? left === undefined ? 'Unavailable' : money(left, budgetSummary?.budget.currency ?? team.budget.currency) : '—'}</strong></div></div>
            {team.budget && <><div className="team-budget-track"><span style={{ width: `${Math.min(total ? (spent / total) * 100 : 0, 100)}%` }}/></div><div className="team-budget-caption">{budgetSummary ? `${money(spent, budgetSummary.budget.currency)} spent · ${Math.round(total ? spent / total * 100 : 0)}% used` : 'Spending summary unavailable'}</div></>}
            <div className="team-card-controls">{isCreator && <><button className="edit-budget-button" onClick={() => openModal('rename', team)}>Rename</button><button className="edit-budget-button" onClick={() => openModal('budget', team)}>{team.budget ? 'Edit budget' : 'Set budget'}</button><button className="edit-budget-button team-delete-action" onClick={() => void removeTeam(team)}>Delete</button></>}<Link className="team-open-link" to={`/teams/${team.id}`}>Open team details <ArrowRight size={15}/></Link></div>
          </article>;
        })}
      </div> : <section className="panel team-empty-state"><span><UsersRound size={20}/></span><h2>{teams.length ? 'No matching teams' : 'No teams yet'}</h2><p>{teams.length ? 'Try a different search.' : 'Create a team to organize this organization.'}</p></section>}
    </>}

    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(null); }}><form className="modal-card" onSubmit={(event) => void submit(event)}>
      <div className="modal-heading"><div><span className="modal-icon"><UsersRound size={18}/></span><h2>{modal === 'create' ? 'Create a team' : modal === 'rename' ? 'Rename team' : 'Team budget'}</h2><p>{modal === 'create' ? 'Create a team for this organization.' : modal === 'rename' ? 'Update the name shown to the team.' : 'Set the monthly spending limit for this team.'}</p></div><button type="button" className="icon-button" onClick={() => setModal(null)} aria-label="Close" disabled={saving}><X size={18}/></button></div>
      {(modal === 'create' || modal === 'rename') && <label className="form-label">Team name<input autoFocus required maxLength={100} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Customer success"/></label>}
      {(modal === 'create' || modal === 'budget') && <><label className="form-label">{modal === 'create' ? 'Initial monthly budget (optional)' : 'Monthly budget'}<input type="number" min="0.01" step="0.01" required={modal === 'budget'} value={budgetValue} onChange={(event) => setBudgetValue(event.target.value)} placeholder="0.00"/></label><label className="form-label">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option></select></label></>}
      {error && <div className="form-note" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Create team' : modal === 'rename' ? 'Save name' : 'Save budget'}</button></div>
    </form></div>}
  </div>;
}
