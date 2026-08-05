import { useEffect, useState } from 'react';
import * as api from '@/services/api';
import type { BudgetStatus } from '@/services/api';
import type { Category, Team } from '@/types';
import PageHeader from '@/components/PageHeader';
import BudgetProgressBar from '@/components/BudgetProgressBar';

export default function BudgetsPage() {
  const [statuses, setStatuses] = useState<BudgetStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState<string | null>(null); // `${teamId}:${categoryId}`
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // New budget form
  const [newTeam, setNewTeam] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    Promise.all([api.getBudgetStatus(), api.getCategories(), api.getTeams()])
      .then(([s, c, t]) => {
        setStatuses(s);
        setCategories(c);
        setTeams(t);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? 'Uncategorized';
  const teamName = (id: string) =>
    teams.find((t) => t.id === id)?.name ?? 'Unknown';

  const startEdit = (key: string, currentLimit: number) => {
    setEditing(key);
    setEditValue(String(currentLimit));
  };

  const saveEdit = async (teamId: string, categoryId: string) => {
    const limit = Number(editValue);
    if (Number.isNaN(limit) || limit < 0) return;
    setSaving(true);
    try {
      await api.upsertBudget(teamId, categoryId, limit);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const validateNew = () => {
    const next: Record<string, string> = {};
    if (!newTeam) next.team = 'Select a team';
    if (!newCategory) next.category = 'Select a category';
    const limit = Number(newLimit);
    if (!newLimit) next.limit = 'Required';
    else if (Number.isNaN(limit) || limit <= 0) next.limit = 'Must be a positive number';
    setNewErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNew()) return;
    setSaving(true);
    try {
      await api.upsertBudget(newTeam, newCategory, Number(newLimit));
      setNewTeam('');
      setNewCategory('');
      setNewLimit('');
      setNewErrors({});
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Monthly limits per category, per team"
      />

      <div className="px-8 py-6 space-y-8">
        {/* Set new budget */}
        <form
          onSubmit={handleCreate}
          className="rounded-lg border border-gray-200 bg-white p-5"
        >
          <h3 className="text-sm font-medium mb-3">Set a monthly budget</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Team</label>
              <select
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {newErrors.team && (
                <p className="mt-1 text-xs text-red-600">{newErrors.team}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {newErrors.category && (
                <p className="mt-1 text-xs text-red-600">{newErrors.category}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Monthly limit ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              {newErrors.limit && (
                <p className="mt-1 text-xs text-red-600">{newErrors.limit}</p>
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save budget'}
              </button>
            </div>
          </div>
        </form>

        {/* Existing budgets */}
        {loading ? (
          <p className="text-gray-500">Loading budgets…</p>
        ) : statuses.length === 0 ? (
          <p className="text-gray-500">No budgets set yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {statuses.map((s) => {
              const key = `${s.budget.teamId}:${s.budget.categoryId}`;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{categoryName(s.budget.categoryId)}</p>
                      <p className="text-xs text-gray-400">
                        {teamName(s.budget.teamId)}
                      </p>
                    </div>
                    {editing === key ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <button
                          onClick={() =>
                            saveEdit(s.budget.teamId, s.budget.categoryId)
                          }
                          disabled={saving}
                          className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-60"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(key, s.budget.monthlyLimit)}
                        className="text-xs text-gray-500 underline hover:text-gray-900"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <BudgetProgressBar
                    budget={s.budget}
                    spent={s.spent}
                    percentUsed={s.percentUsed}
                    status={s.status}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
