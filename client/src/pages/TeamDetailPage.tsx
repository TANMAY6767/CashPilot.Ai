import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import * as api from '@/services/api';
import type { Category, Expense, Member, Team } from '@/types';
import PageHeader from '@/components/PageHeader';
import ExpenseCard from '@/components/ExpenseCard';

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      api.getTeam(teamId),
      api.getMembersForTeam(teamId),
      api.getExpensesForTeam(teamId),
      api.getCategories(),
    ])
      .then(([t, m, e, c]) => {
        setTeam(t ?? null);
        setMembers(m);
        setExpenses(e);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError('Enter a valid email');
      return;
    }
    setInviting(true);
    try {
      const member = await api.inviteMember(teamId!, inviteEmail.trim());
      setMembers((prev) => [...prev, member]);
      setInviteEmail('');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return <div className="px-8 py-10 text-gray-500">Loading team…</div>;
  }

  if (!team) {
    return (
      <div className="px-8 py-10">
        <p className="text-gray-500">Team not found.</p>
        <Link to="/teams" className="text-sm underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={team.name}
        subtitle={team.description}
        actions={
          <Link
            to="/teams"
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        }
      />

      <div className="px-8 py-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Members</h3>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>

          <form
            onSubmit={handleInvite}
            className="mt-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <label className="block text-sm font-medium mb-1">
              Invite member
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="submit"
                disabled={inviting}
                className="flex items-center gap-1 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <UserPlus size={16} />
                Invite
              </button>
            </div>
            {inviteError && (
              <p className="mt-1 text-xs text-red-600">{inviteError}</p>
            )}
          </form>
        </section>

        <section className="lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Shared expenses
          </h3>
          {expenses.length === 0 ? (
            <p className="text-gray-500">No expenses yet for this team.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((e) => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  members={members}
                  categories={categories}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
