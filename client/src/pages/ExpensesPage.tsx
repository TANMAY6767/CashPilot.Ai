import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import * as api from '@/services/api';
import type {
  Category,
  Expense,
  Member,
  SplitMethod,
  Team,
} from '@/types';
import PageHeader from '@/components/PageHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const today = () => new Date().toISOString().slice(0, 10);

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [teamFilter, setTeamFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Add-expense form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    categoryId: '',
    teamId: '',
    paidBy: '',
    date: today(),
    splitMethod: 'equal' as SplitMethod,
  });
  const [splitMembers, setSplitMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getExpenses(),
      api.getTeams(),
      api.getMembers(),
      api.getCategories(),
    ])
      .then(([e, t, m, c]) => {
        setExpenses(e);
        setTeams(t);
        setMembers(m);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const memberName = (id: string) =>
    members.find((m) => m.id === id)?.name ?? 'Unknown';
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? 'Uncategorized';

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => (teamFilter ? e.teamId === teamFilter : true))
      .filter((e) => (categoryFilter ? e.categoryId === categoryFilter : true))
      .filter((e) => (fromDate ? new Date(e.date) >= new Date(fromDate) : true))
      .filter((e) => (toDate ? new Date(e.date) <= new Date(toDate) : true))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, teamFilter, categoryFilter, fromDate, toDate]);

  const teamMembers = useMemo(
    () =>
      teams.find((t) => t.id === form.teamId)?.memberIds ?? [],
    [teams, form.teamId],
  );

  const toggleSplitMember = (id: string) => {
    setSplitMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.description.trim()) next.description = 'Required';
    const amount = Number(form.amount);
    if (!form.amount) next.amount = 'Required';
    else if (Number.isNaN(amount) || amount <= 0) next.amount = 'Must be a positive number';
    if (!form.teamId) next.teamId = 'Select a team';
    if (!form.categoryId) next.categoryId = 'Select a category';
    if (!form.paidBy) next.paidBy = 'Select who paid';
    if (!form.date) next.date = 'Required';
    if (splitMembers.length === 0) next.split = 'Select at least one member';
    if (form.splitMethod === 'custom') {
      const total = splitMembers.reduce(
        (sum, id) => sum + (Number(customAmounts[id]) || 0),
        0,
      );
      if (Math.abs(total - amount) > 0.01) {
        next.split = `Split amounts must sum to ${fmt(amount)} (currently ${fmt(total)})`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const created = await api.createExpense({
        teamId: form.teamId,
        description: form.description.trim(),
        amount: Number(form.amount),
        categoryId: form.categoryId,
        paidBy: form.paidBy,
        date: new Date(form.date).toISOString(),
        splitMethod: form.splitMethod,
        splitBetween: splitMembers.map((id) => ({
          memberId: id,
          amount:
            form.splitMethod === 'custom'
              ? Number(customAmounts[id]) || 0
              : undefined,
        })),
      });
      setExpenses((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({
        description: '',
        amount: '',
        categoryId: '',
        teamId: '',
        paidBy: '',
        date: today(),
        splitMethod: 'equal',
      });
      setSplitMembers([]);
      setCustomAmounts({});
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  const clearFilters = () => {
    setTeamFilter('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="All spending across your teams"
        actions={
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus size={16} />
            Add expense
          </button>
        }
      />

      <div className="px-8 py-6 space-y-6">
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-gray-200 bg-white p-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Team</label>
                <select
                  value={form.teamId}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, teamId: e.target.value, paidBy: '' }));
                    setSplitMembers([]);
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {errors.teamId && (
                  <p className="mt-1 text-xs text-red-600">{errors.teamId}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, categoryId: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paid by</label>
                <select
                  value={form.paidBy}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidBy: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a member</option>
                  {teamMembers.map((id) => (
                    <option key={id} value={id}>
                      {memberName(id)}
                    </option>
                  ))}
                </select>
                {errors.paidBy && (
                  <p className="mt-1 text-xs text-red-600">{errors.paidBy}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {errors.date && (
                  <p className="mt-1 text-xs text-red-600">{errors.date}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Split method</label>
              <div className="flex gap-4">
                {(['equal', 'custom'] as SplitMethod[]).map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={form.splitMethod === m}
                      onChange={() =>
                        setForm((f) => ({ ...f, splitMethod: m }))
                      }
                    />
                    {m === 'equal' ? 'Equal split' : 'Custom amounts'}
                  </label>
                ))}
              </div>
            </div>

            {form.teamId && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Split between
                </label>
                <div className="space-y-2">
                  {teamMembers.map((id) => (
                    <div key={id} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm flex-1">
                        <input
                          type="checkbox"
                          checked={splitMembers.includes(id)}
                          onChange={() => toggleSplitMember(id)}
                        />
                        {memberName(id)}
                      </label>
                      {form.splitMethod === 'custom' &&
                        splitMembers.includes(id) && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={customAmounts[id] ?? ''}
                            onChange={(e) =>
                              setCustomAmounts((p) => ({
                                ...p,
                                [id]: e.target.value,
                              }))
                            }
                            className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        )}
                    </div>
                  ))}
                </div>
                {errors.split && (
                  <p className="mt-1 text-xs text-red-600">{errors.split}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save expense'}
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

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Team</label>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          {(teamFilter || categoryFilter || fromDate || toDate) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-gray-500">Loading expenses…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500">No expenses match the current filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Paid by</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Split between</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{e.description}</td>
                    <td className="px-4 py-3 font-medium">{fmt(e.amount)}</td>
                    <td className="px-4 py-3">{categoryName(e.categoryId)}</td>
                    <td className="px-4 py-3">{memberName(e.paidBy)}</td>
                    <td className="px-4 py-3">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {e.splitBetween
                        .map((s) => memberName(s.memberId))
                        .join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
