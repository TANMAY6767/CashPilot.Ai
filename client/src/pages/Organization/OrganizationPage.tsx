import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CircleEllipsis,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import {
  getAllOrgs,
  createOrg,
  type Organization,
} from "@/services/oraganizations/org.services";
const initialOrganizations = [
  {
    id: "northstar",
    name: "Northstar Studio",
    initials: "N",
    description: "Design & technology studio",
    role: "Owner",
    members: 24,
    teams: 8,
    spend: "$42,680",
    tone: "violet",
  },
  {
    id: "fieldwork",
    name: "Fieldwork Labs",
    initials: "F",
    description: "Product research collective",
    role: "Admin",
    members: 12,
    teams: 4,
    spend: "$18,240",
    tone: "green",
  },
];

export default function OrganizationPage() {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  
  const navigate = useNavigate();
  const loadOrganizations = async() => {
    try{
      setLoading(true);
      const response = await getAllOrgs();
      setOrgs(response ?? []);
    }catch(e){
    console.error(error);
    }finally{
    setLoading(false);
    }
  }
    useEffect(() => {
      loadOrganizations();
    }, []);
  const handleCreateOrganization = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!orgName.trim()) {
      setError('Organization name is required');
      return;
    }

    try {
      setCreating(true);
      setError('');

      await createOrg(orgName.trim());

      // Clear form
      setOrgName('');

      // Close form
      setShowForm(false);

      // Fetch organizations again
      await loadOrganizations();

    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to create organization');
      }
    } finally {
      setCreating(false);
    }
  };
  
  return (
    <div className="page-wrap">
      {/* Page Header */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            YOUR WORKSPACE
          </div>

          <h1>Organizations</h1>

          <p>
            Manage your organizations, members, and spending.
          </p>
        </div>

        <button
          className="button button-primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          Create organization
        </button>
      </div>

      {/* Summary */}
      <div className="org-summary-row">
        <div>
          <strong>{orgs.length}</strong>
          <span>Organizations</span>
        </div>

        <div>
          <strong>
            {orgs.reduce(
              (sum, org) => sum + org.memberCount,
              0
            )}
          </strong>
          <span>Total members</span>
        </div>

        <div>
          <strong>
            {orgs.reduce(
              (sum, org) => sum + org.teamCount,
              0
            )}
          </strong>
          <span>Teams across orgs</span>
        </div>
      </div>

      {/* Section Heading */}
      <div className="section-inline-heading org-list-heading">
        <div>
          <h2>Your organizations</h2>

          <p>
            Choose an organization to manage its team and settings.
          </p>
        </div>
      </div>

      {/* Organizations */}
      <div className="organization-grid">
        {orgs.map((org) => (
          <article
            className="panel organization-card"
            key={org.id}
            onClick={() =>
              navigate(`/organization/${org.id}`)
            }
          >
            {/* Card Top */}
            <div className="org-card-top">
              <div
                className={`org-avatar org-tone-violet`}
              >
                {org?.name?.trim().slice(0, 2).toUpperCase() || 'JD'}
              </div>

              <button
                className="icon-button"
                aria-label="Organization options"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <CircleEllipsis size={20} />
              </button>
            </div>

            {/* Title */}
            <div className="org-card-title">
              <h3>{org.name}</h3>

              <span className="role-pill role-owner">
                {org.role}
              </span>
            </div>

            {/* Description */}
            {/* <p className="team-description">
              {org.description}
            </p> */}

            {/* Stats */}
            <div className="org-card-stats">
              <span>
                <UsersRound size={15} />
                {org.memberCount} members
              </span>

              <span>
                <Building2 size={15} />
                {org.teamCount} teams
              </span>
            </div>

            {/* Spend */}
            {/* <div className="org-spend-line">
              <span>Spent this month</span>
              <strong>{org.spend ?? 0}</strong>
            </div> */}

            {/* Footer */}
            <button className="org-card-footer">
              Open organization
              <ArrowRight size={15} />
            </button>
          </article>
        ))}

        {/* Create Organization Card */}
        <button
          className="create-org-card"
          onClick={() => setShowForm(true)}
        >
          <span>
            <Plus size={20} />
          </span>

          <strong>Create a new organization</strong>

          <small>
            Set up a new workspace for your team.
          </small>
        </button>
      </div>

      {/* Create Organization Modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <form
            className="modal-card"
            onSubmit={handleCreateOrganization}
          >
            {/* Modal Header */}
            <div className="modal-heading">
              <div>
                <span className="modal-icon">
                  <Building2 size={18} />
                </span>

                <h2>Create an organization</h2>

                <p>
                  Start managing your organization’s spending.
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {/* Organization Name */}
            <label className="form-label">
              Organization name

              <input
                autoFocus
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Northstar Studio"
              />
            </label>

            {/* Automatically Created Accounts */}
            <div className="account-preview">
              <span className="subtle-label">
                ACCOUNTS CREATED AUTOMATICALLY
              </span>
              

              <div>
                <span className="account-symbol cash">
                  $
                </span>

                <span>
                  <strong>Financial Cash Account</strong>

                  <small>
                    Tracks available organization funds
                  </small>
                </span>
              </div>

              <div>
                <span className="account-symbol payable">
                  ↗
                </span>

                <span>
                  <strong>Employee Payable Account</strong>

                  <small>
                    Tracks amounts owed to employees
                  </small>
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                    setShowForm(false);
                    setOrgName('');
                    setError('');
                  }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-primary"
              >
                <Plus size={16} />
                Create organization
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}