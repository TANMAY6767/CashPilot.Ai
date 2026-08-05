import type { Expense, Member, Category } from '@/types';

interface Props {
  expense: Expense;
  members: Member[];
  categories: Category[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export default function ExpenseCard({ expense, members, categories }: Props) {
  const paidByMember = members.find((m) => m.id === expense.paidBy);
  const category = categories.find((c) => c.id === expense.categoryId);
  const splitNames = expense.splitBetween
    .map((s) => members.find((m) => m.id === s.memberId)?.name ?? 'Unknown')
    .join(', ');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{expense.description}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {category?.name ?? 'Uncategorized'} · {fmtDate(expense.date)}
          </p>
        </div>
        <p className="font-semibold whitespace-nowrap">{fmt(expense.amount)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Paid by <strong className="text-gray-700">{paidByMember?.name ?? 'Unknown'}</strong></span>
        <span>Split: {splitNames}</span>
      </div>
    </div>
  );
}
