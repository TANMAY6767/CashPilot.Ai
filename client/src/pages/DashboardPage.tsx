import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import * as api from '@/services/api';
import type { Category, Expense, Member } from '@/types';
import PageHeader from '@/components/PageHeader';
import SummaryCard from '@/components/SummaryCard';
import ExpenseCard from '@/components/ExpenseCard';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function DashboardPage() {
  const [summary, setSummary] = useState<api.DashboardSummary | null>(null);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getRecentExpenses(6),
      api.getMembers(),
      api.getCategories(),
    ])
      .then(([s, r, m, c]) => {
        setSummary(s);
        setRecent(r);
        setMembers(m);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <div className="px-8 py-10 text-gray-500">Loading dashboard…</div>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your team spending at a glance" />

      <div className="px-8 py-6 space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total spent this month"
            value={fmt(summary.totalSpentThisMonth)}
          />
          <SummaryCard
            label="Budget remaining"
            value={fmt(summary.budgetRemaining)}
          />
          <SummaryCard
            label="Active teams"
            value={summary.activeTeamCount}
          />
        </div>

        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Spend by category (this month)
          </h3>
          <div className="rounded-lg border border-gray-200 bg-white p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.spendByCategory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="categoryName"
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <Tooltip
                  formatter={(value) => fmt(Number(value))}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="amount" fill="#111827" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Recent expenses
          </h3>
          <div className="space-y-3">
            {recent.map((e) => (
              <ExpenseCard
                key={e.id}
                expense={e}
                members={members}
                categories={categories}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
