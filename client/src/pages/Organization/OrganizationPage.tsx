import { useState, type FormEvent } from 'react';
import { ArrowRight, Building2, Plus, UsersRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { createOrg } from '@/services/oraganizations/org.services';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export default function OrganizationPage() {
  const { user } = useAuth();
  const { organizations, loadingOrganizations, organizationError, refreshOrganizations, selectOrganization } = useOrganization();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const openOrganization = (id: string) => {
    selectOrganization(id);
    navigate('/dashboard');
  };

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orgName.trim() || creating) return;
    try {
      setCreating(true);
      setError('');
      const response = await createOrg(orgName.trim());
      if (response.error) throw new Error(response.error);
      setOrgName('');
      setShowForm(false);
      await refreshOrganizations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create organization.');
    } finally {
      setCreating(false);
    }
  };

  return <div className="page-wrap organization-home">
    <section className="org-welcome panel">
      <div className="org-welcome-copy">
        <span className="eyebrow"><span className="eyebrow-dot"/> YOUR CASHFLOW WORKSPACE</span>
        <h1>Good to see you, {user?.name?.split(' ')[0] || 'there'}.</h1>
        <p>Choose an organization to view its overview, teams, budgets, and transactions.</p>
      </div>
      <div className="org-welcome-profile"><div className="avatar avatar-indigo">{initials(user?.name || 'U')}</div><div><strong>{user?.name || 'Your account'}</strong><span>{user?.email || 'Personal workspace'}</span></div></div>
    </section>

    <div className="org-summary-row org-summary-home">
      <div><strong>{organizations.length}</strong><span>Organizations</span></div>
      <div><strong>{organizations.reduce((sum, organization) => sum + organization.memberCount, 0)}</strong><span>Total members</span></div>
      <div><strong>{organizations.reduce((sum, organization) => sum + organization.teamCount, 0)}</strong><span>Teams across organizations</span></div>
    </div>

    <div className="section-inline-heading org-list-heading"><div><h2>Your organizations</h2><p>Each organization has its own team budgets and activity.</p></div><button className="button button-primary" onClick={() => { setError(''); setShowForm(true); }}><Plus size={17}/>Create organization</button></div>
    {(organizationError || error) && <div className="form-note" role="alert">{error || organizationError}</div>}
    {loadingOrganizations ? <section className="panel org-home-empty"><p>Loading your organizations…</p></section> : organizations.length ? <div className="organization-grid">
      {organizations.map((organization, index) => <button className="panel organization-card org-home-card" key={organization.id} onClick={() => openOrganization(organization.id)}>
        <div className="org-card-top"><div className={`org-avatar org-tone-${['violet', 'green', 'blue', 'orange'][index % 4]}`}>{initials(organization.name)}</div><span className="role-pill role-owner">{organization.role}</span></div>
        <div className="org-card-title"><h3>{organization.name}</h3><ArrowRight size={18}/></div>
        <p className="org-home-hint">Open organization overview</p>
        <div className="org-card-stats"><span><UsersRound size={15}/>{organization.memberCount} {organization.memberCount === 1 ? 'member' : 'members'}</span><span><Building2 size={15}/>{organization.teamCount} {organization.teamCount === 1 ? 'team' : 'teams'}</span></div>
        <span className="org-card-footer">View organization <ArrowRight size={15}/></span>
      </button>)}
      <button className="create-org-card" onClick={() => { setError(''); setShowForm(true); }}><span><Plus size={20}/></span><strong>Create an organization</strong><small>Set up a new workspace for your team.</small></button>
    </div> : <section className="panel org-home-empty"><span className="modal-icon"><Building2 size={19}/></span><h2>Your workspace starts here</h2><p>Create an organization or ask a teammate to invite you.</p><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={16}/>Create organization</button></section>}

    {showForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) setShowForm(false); }}><form className="modal-card" onSubmit={(event) => void handleCreateOrganization(event)}>
      <div className="modal-heading"><div><span className="modal-icon"><Building2 size={18}/></span><h2>Create an organization</h2><p>Start managing a separate organization's spending.</p></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close" disabled={creating}><X size={19}/></button></div>
      <label className="form-label">Organization name<input autoFocus required maxLength={100} value={orgName} onChange={(event) => setOrgName(event.target.value)} placeholder="e.g. Northstar Studio"/></label>
      {error && <div className="form-note" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setShowForm(false)} disabled={creating}>Cancel</button><button type="submit" className="button button-primary" disabled={creating}><Plus size={16}/>{creating ? 'Creating…' : 'Create organization'}</button></div>
    </form></div>}
  </div>;
}
