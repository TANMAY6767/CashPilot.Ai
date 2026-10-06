import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  CircleEllipsis,
  Plus,
  ShieldCheck,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import {
  addOrganizationFunds,
  getFinancialCashFunds,
  getOrganizationAccounts,
  getOrg,
  type OrganizationDetail,
  type OrgAccounts,
} from "@/services/oraganizations/org.services";
import { sendOrganizationInvitation } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
type Tab = "overview" | "members" | "accounts";

const getAccountDescription = (account: OrgAccounts) => {
  const name = account.name.toLowerCase();

  if (name.includes('financial cash')) {
    return 'Cash held by the organization. Owner funding increases this balance.';
  }
  if (name.includes('payable')) {
    return 'Amounts the organization owes to employees and other payees.';
  }
  if (name.includes('capital')) {
    return 'Owner contributions recorded for the organization.';
  }
  return 'Current balance calculated from this account’s ledger entries.';
};

const people = [
  {
    name: "Jordan Davis",
    email: "jordan@northstar.co",
    role: "Owner",
    teams: "Engineering",
    initials: "JD",
    color: "indigo",
  },
  {
    name: "Alex Kim",
    email: "alex@northstar.co",
    role: "Admin",
    teams: "Sales, Marketing",
    initials: "AK",
    color: "pink",
  },
  {
    name: "Morgan Lee",
    email: "morgan@northstar.co",
    role: "Member",
    teams: "Product & Design",
    initials: "ML",
    color: "green",
  },
  {
    name: "Sam Chen",
    email: "sam@northstar.co",
    role: "Member",
    teams: "People & Culture",
    initials: "SC",
    color: "blue",
  },
];

const teams = [
  {
    name: "Engineering",
    members: 8,
    budget: "$26,000",
    tone: "violet",
    initials: "EN",
  },
  {
    name: "Product & Design",
    members: 5,
    budget: "$18,000",
    tone: "blue",
    initials: "PD",
  },
  {
    name: "Sales",
    members: 6,
    budget: "$15,000",
    tone: "orange",
    initials: "SA",
  },
];

export default function OrganizationOverview() {
  const { orgId } = useParams<{ orgId: string }>();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [accounts, setAccounts] = useState<OrgAccounts[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [members, setMembers] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // const [teams,setTeams] = useState(0);
  const title =
    orgId === "fieldwork"
      ? "Fieldwork Labs"
      : orgId
        ? orgId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (x) => x.toUpperCase())
        : "Northstar Studio";

  const [tab, setTab] = useState<Tab>("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgRole, setOrgRole] = useState("Member");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [fundingOpen, setFundingOpen] = useState(false);
  const [fundingAmount, setFundingAmount] = useState('');
  const [fundingDescription, setFundingDescription] = useState('');
  const [fundingSubmitting, setFundingSubmitting] = useState(false);
  const [fundingError, setFundingError] = useState('');
  const [fundingComplete, setFundingComplete] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState('');

  const sendInvite = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!orgId || !email.trim()) return;

    try {
      setSendingInvite(true);
      setInviteError('');
      await sendOrganizationInvitation(
        orgId,
        email.trim(),
        orgRole.toLowerCase()
      );
      setSent(true);
      setEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send invitation.');
    } finally {
      setSendingInvite(false);
    }
  };
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setOrg(null);
        setAccounts([]);
        setAccountsLoading(false);
        setCashBalance(0);
        setAccountsError('');
        const data = await getOrg(orgId);
        if (cancelled) return;
        if (!data) {
          setError("Organization not found");
        } else {
          setOrg(data);

          const isOwner = data.members.some(
            (member) => member.userId === user?.id && member.role === 'owner'
          );

          if (isOwner) {
            setAccountsLoading(true);
            try {
              const [organizationAccounts, cashFunds] = await Promise.all([
                getOrganizationAccounts(orgId),
                getFinancialCashFunds(orgId),
              ]);
              if (!cancelled) {
                setAccounts(organizationAccounts);
                setCashBalance(cashFunds.balance);
              }
            } catch (accountLoadError) {
              if (!cancelled) {
                setAccountsError(
                  accountLoadError instanceof Error
                    ? accountLoadError.message
                    : 'Could not load organization account balances.'
                );
              }
            } finally {
              if (!cancelled) setAccountsLoading(false);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load organization");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, user?.id]);

  const currentMembership = org?.id === orgId
    ? org.members.find((member) => member.userId === user?.id)
    : undefined;
  const isOrganizationOwner = currentMembership?.role === 'owner';

  const submitAddMoney = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(fundingAmount);

    if (!orgId || !Number.isFinite(amount) || amount <= 0) {
      setFundingError('Enter an amount greater than zero.');
      return;
    }

    try {
      setFundingSubmitting(true);
      setFundingError('');
      await addOrganizationFunds(orgId, amount, fundingDescription.trim() || undefined);
      setCashBalance((balance) => balance + amount);
      setAccounts((currentAccounts) => currentAccounts.map((account) => {
        const normalizedName = account.name.toLowerCase();
        return normalizedName.includes('financial cash') || normalizedName.includes('owner capital')
          ? { ...account, balance: account.balance + amount }
          : account;
      }));
      setFundingComplete(true);
      setFundingAmount('');
      setFundingDescription('');

      try {
        const [organizationAccounts, cashFunds] = await Promise.all([
          getOrganizationAccounts(orgId),
          getFinancialCashFunds(orgId),
        ]);
        setAccounts(organizationAccounts);
        setCashBalance(cashFunds.balance);
        setAccountsError('');
      } catch {
        setAccountsError('Funds were added, but balances could not be refreshed. Reload the organization to see the latest balances.');
      }
    } catch (err) {
      setFundingError(err instanceof Error ? err.message : 'Could not add funds.');
    } finally {
      setFundingSubmitting(false);
    }
  };

  const closeFunding = () => {
    setFundingOpen(false);
    setFundingAmount('');
    setFundingDescription('');
    setFundingError('');
    setFundingComplete(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading organization...</p>
      </div>
    );
  }
  if (error || !org) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/organization")}
          className="mb-4 px-4 py-2 border-2 border-black rounded-lg font-bold"
        >
          ← Back
        </button>
        <p className="text-red-500">{error || "Organization not found"}</p>
      </div>
    );
  }
  return (
    <div className="page-wrap">
      {/* Back Link */}
      <Link to="/organization" className="back-link">
        <ArrowLeft size={15} />
        All organizations
      </Link>

      {/* Organization Header */}
      <div className="org-detail-heading">
        <div className="org-avatar org-tone-violet org-avatar-large">
          {title[0]}
        </div>

        <div className="org-detail-title">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            ORGANIZATION
          </div>

          <h1>{title}</h1>

          <p>
            Created September 12, 2025 <span>•</span> Your role: {currentMembership?.role ?? 'member'}
          </p>
        </div>

        <div className="heading-actions">
          <button className="button button-secondary">
            <CircleEllipsis size={17} />
            More
          </button>

          <button
            className="button button-primary"
            onClick={() => {
              setInviteOpen(true);
              setSent(false);
              setInviteError('');
            }}
          >
            <Plus size={17} />
            Invite member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-row org-tabs">
        <button
          className={`tab-button ${tab === "overview" ? "tab-active" : ""
            }`}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>

        <button
          className={`tab-button ${tab === "members" ? "tab-active" : ""
            }`}
          onClick={() => setTab("members")}
        >
          Members <span>{org.members.length}</span>
        </button>

        {isOrganizationOwner && (
          <button
            className={`tab-button ${tab === "accounts" ? "tab-active" : ""}`}
            onClick={() => setTab("accounts")}
          >
            Accounts <span>{accounts.length}</span>
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <>
          {/* Metrics */}
          <div className="metric-grid org-metrics">
            <MiniMetric
              title="Members"
              value={String(org.members.length)}
              note="3 invitations pending"
              icon={<UsersRound size={18} />}
            />

            <MiniMetric
              title="Teams"
              value={String(org.teams.length)}
              note="Across your organization"
              icon={<Building2 size={18} />}
            />

            <MiniMetric
              title="Spent this month"
              value="$42,680"
              note="61% of total budget"
              icon={<Wallet size={18} />}
            />

            <MiniMetric
              title="Available budget"
              value="$27,320"
              note="Across all teams"
              icon={<CreditCard size={18} />}
            />
          </div>

          {/* Overview Grid */}
          <div className="organization-overview-grid">
            {/* Teams */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Teams</h2>
                  <p>Budgets and membership by team</p>
                </div>

                <Link to="/teams" className="text-link">
                  Manage teams
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="org-team-list">
                {org.teams.map((team) => (
                  <div className="org-team-row" key={team.name}>
                    <div className={`team-avatar tone-${team.tone}`}>
                      {team.initials}
                    </div>

                    <div className="org-team-name">
                      <strong>{team.name}</strong>
                      <span>{team.members} members</span>
                    </div>

                    <div className="org-team-budget">
                      <strong>{team.budget}</strong>
                      <span>monthly budget</span>
                    </div>

                    <ArrowRight size={16} />
                  </div>
                ))}
              </div>

              <Link className="panel-footer-link" to="/teams">
                <Plus size={15} />
                Create a team
              </Link>
            </section>

            {/* Members */}
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Organization members</h2>
                  <p>People with access to this workspace</p>
                </div>

                <button
                  className="text-link"
                  onClick={() => setTab("members")}
                >
                  View all
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="org-member-list">
                {org.members
                  .slice(0, 3)
                  .map((person) => (
                    <MemberRow
                      key={person.user.email}
                      person={person}
                    />
                  ))}
              </div>

              <button
                className="panel-footer-link"
                onClick={() => {
                  setInviteOpen(true);
                  setSent(false);
                }}
              >
                <Plus size={15} />
                Invite a member
              </button>
            </section>
          </div>

          {/* Accounts Strip */}
          {isOrganizationOwner && <section className="panel account-strip">
            <div className="account-strip-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <strong>Organization accounts are ready</strong>

              <p>
                Every organization has a cash account and an employee
                payable account.
              </p>
            </div>

            <button
              className="text-link"
              onClick={() => setTab("accounts")}
            >
              View accounts
              <ArrowRight size={14} />
            </button>
          </section>}
        </>
      )}

      {/* Members Tab */}
      {tab === "members" && (
        <section className="panel member-panel">
          <div className="panel-heading">
            <div>
              <h2>Organization members</h2>
              <p>
                Manage access and assign organization roles.
              </p>
            </div>

            <button
              className="button button-primary"
              onClick={() => {
                setInviteOpen(true);
                setSent(false);
              }}
            >
              <Plus size={16} />
              Invite member
            </button>
          </div>

          <div className="table-scroll">
            <table className="data-table member-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>ORGANIZATION ROLE</th>
                  <th>TEAMS</th>
                  <th>TEAM ROLE</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {org.members.map((person) => (
                  <tr key={person.user.email}>
                    <td>
                      <div className="person-cell">
                        <span
                          className={`avatar avatar-small avatar-green`}
                        >
                          {person.user.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>{person.user.name}</strong>
                          <span>{person.user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {person.role === "owner" ? (
                        <span className="role-pill role-owner">
                          Owner
                        </span>
                      ) : (
                        <select
                          className="role-select"
                          defaultValue={person.role}
                        >
                          <option>Admin</option>
                          <option>Member</option>
                        </select>
                      )}
                    </td>

                    {/* <td>{person.teams}</td> */}

                    <td>
                      <select
                        className="role-select"
                        defaultValue="Member"
                      >
                        <option>Team admin</option>
                        <option>Member</option>
                      </select>
                    </td>

                    <td>
                      <button className="icon-button">
                        <CircleEllipsis size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Accounts Tab */}
      {tab === "accounts" && isOrganizationOwner && (
        <>
          <div className="section-inline-heading account-heading">
            <div>
              <h2>Organization accounts</h2>

              <p>
                Default accounts created for tracking company funds
                and employee expenses.
              </p>
            </div>
          </div>

          <div className="account-grid">
            {accountsLoading ? (
              <section className="panel p-5 text-sm">Loading account balances…</section>
            ) : accountsError ? (
              <section className="panel p-5 text-sm text-red-600" role="alert">{accountsError}</section>
            ) : accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                icon={<Wallet size={20} />}
                tone="mint"
                name={acc.name}
                type={acc.accountType}
                amount={`$${(acc.name.toLowerCase() === 'financial cash account' ? cashBalance : acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                description={getAccountDescription(acc)}
                canAddMoney={isOrganizationOwner && acc.name.toLowerCase() === 'financial cash account'}
                onAddMoney={() => {
                  setFundingOpen(true);
                  setFundingError('');
                  setFundingComplete(false);
                }}
              />
            ))}
            {!accountsLoading && !accountsError && accounts.length === 0 && (
              <section className="panel p-5 text-sm">No organization accounts found.</section>
            )}

          </div>

          <div className="account-hint">
            <ShieldCheck size={17} />

            <span>
              Account balances are calculated from their ledger entries. Accounts without ledger activity start at $0.00.
            </span>
          </div>
        </>
      )}

      {/* Bottom Status */}
      <div className="bottom-note">
        <span className="status-dot" />
        Organization data is up to date
      </div>

      {fundingOpen && isOrganizationOwner && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeFunding();
          }}
        >
          <form className="modal-card" onSubmit={submitAddMoney}>
            <div className="modal-heading">
              <div>
                <span className="modal-icon"><Wallet size={18} /></span>
                <h2>Add money to cash account</h2>
                <p>Financial cash Account · Current balance ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeFunding} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            {fundingComplete ? (
              <div className="invite-success">
                <span><Check size={20} /></span>
                <strong>Funds added</strong>
                <small>{accountsError || 'The cash and capital account balances are up to date.'}</small>
                <div className="modal-actions">
                  <button type="button" className="button button-primary" onClick={closeFunding}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <label className="form-label">Amount
                  <div className="input-with-prefix">
                    <span>$</span>
                    <input
                      autoFocus
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={fundingAmount}
                      onChange={(event) => setFundingAmount(event.target.value)}
                    />
                  </div>
                </label>
                <label className="form-label">Description (optional)
                  <input
                    type="text"
                    maxLength={500}
                    placeholder="e.g. Initial organization funding"
                    value={fundingDescription}
                    onChange={(event) => setFundingDescription(event.target.value)}
                  />
                </label>
                {fundingError && <p role="alert" className="text-sm text-red-600">{fundingError}</p>}
                <div className="modal-actions">
                  <button type="button" className="button button-secondary" onClick={closeFunding}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={fundingSubmitting}>
                    <Plus size={16} />{fundingSubmitting ? 'Adding funds…' : 'Add money'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setInviteOpen(false);
              setInviteError('');
            }
          }}
        >
          <form
            className="modal-card"
            onSubmit={sendInvite}
          >
            {/* Modal Header */}
            <div className="modal-heading">
              <div>
                <span className="modal-icon">
                  <UsersRound size={18} />
                </span>

                <h2>Invite to {title}</h2>

                <p>
                  They’ll receive an email invitation to join your
                  organization.
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setInviteOpen(false);
                  setInviteError('');
                }}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {sent ? (
              /* Success State */
              <div className="invite-success">
                <span>
                  <Check size={20} />
                </span>

                <strong>Invitation sent</strong>

                <small>
                  Your teammate will receive an email shortly.
                </small>
              </div>
            ) : (
              <>
                {/* Email */}
                <label className="form-label">
                  Email address

                  <input
                    autoFocus
                    required
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="teammate@company.com"
                  />
                </label>

                {inviteError && (
                  <p role="alert" className="text-sm text-red-600">
                    {inviteError}
                  </p>
                )}

                {/* Organization Role */}
                <label className="form-label">
                  Organization role

                  <select
                    value={orgRole}
                    onChange={(event) =>
                      setOrgRole(event.target.value)
                    }
                  >
                    <option>Member</option>
                    <option>Admin</option>
                  </select>

                  <small className="field-hint">
                    {orgRole === "Admin"
                      ? "Admins can manage members, teams, budgets, and organization settings."
                      : "Members can view the organization and participate in assigned teams."}
                  </small>
                </label>

                {/* Info */}
                <div className="form-note">
                  <ShieldCheck size={16} />
                  Team roles can be assigned after they join.
                </div>

                {/* Actions */}
                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setInviteOpen(false);
                      setInviteError('');
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={sendingInvite}
                  >
                    <Plus size={16} />
                    {sendingInvite ? 'Sending…' : 'Send invitation'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Mini Metric
========================================================= */

function MiniMetric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="panel metric-card">
      <div className="metric-top">
        <span>{title}</span>

        <span className="metric-icon">{icon}</span>
      </div>

      <strong className="metric-value">{value}</strong>

      <div className="metric-foot metric-foot-note">
        {note}
      </div>
    </section>
  );
}

/* =========================================================
   Member Row
========================================================= */

function MemberRow({
  person,
}: {
  person: OrganizationDetail["members"][number];
}) {
  const initials = person.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="org-member-row">
      <span className="avatar avatar-small">
        {initials}
      </span>

      <div className="org-member-name">
        <strong>{person.user.name}</strong>
        <span>{person.user.email}</span>
      </div>

      <span className="role-pill">
        {person.role}
      </span>
    </div>
  );
}
/* =========================================================
   Account Card
========================================================= */

function AccountCard({
  icon,
  tone,
  name,
  type,
  amount,
  description,
  canAddMoney,
  onAddMoney,
}: {
  icon: React.ReactNode;
  tone: string;
  name: string;
  type: string;
  amount: string;
  description: string;
  canAddMoney: boolean;
  onAddMoney: () => void;
}) {
  return (
    <article className="panel account-card">
      <div className={`account-card-icon ${tone}`}>
        {icon}
      </div>

      <span className="account-type">{type}</span>

      <h3>{name}</h3>

      <strong className="account-balance">{amount}</strong>

      <p>{description}</p>

      {canAddMoney && (
        <button className="button button-primary" onClick={onAddMoney}>
          <Plus size={15} />
          Add money
        </button>
      )}

      <button className="account-link">
        View ledger
        <ArrowRight size={15} />
      </button>
    </article>
  );
}
