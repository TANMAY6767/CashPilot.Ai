import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import * as api from '@/services/api';
import type { Team } from '@/types';
import PageHeader from '@/components/PageHeader';
import TeamCard from '@/components/TeamCard';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create-team form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getTeams().then(setTeams).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createTeam(name.trim(), description.trim());
      setName('');
      setDescription('');
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Groups you belong to"
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus size={16} />
            New team
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Team name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create team'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500">Loading teams…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-500">
            No teams yet. Create one to get started.{' '}
            <Link to="/expenses" className="underline">
              Add an expense
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
