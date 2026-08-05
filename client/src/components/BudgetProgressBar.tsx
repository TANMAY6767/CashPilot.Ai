import type { Budget } from '@/types';

interface Props {
  budget: Budget;
  spent: number;
  percentUsed: number;
  status: 'ok' | 'near' | 'over';
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const barColor = (status: Props['status']) =>
  status === 'over'
    ? 'bg-red-500'
    : status === 'near'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

export default function BudgetProgressBar({
  budget,
  spent,
  percentUsed,
  status,
}: Props) {
  const width = Math.min(percentUsed, 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{fmt(spent)} spent</span>
        <span className="text-gray-400">limit {fmt(budget.monthlyLimit)}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(status)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">
        {Math.round(percentUsed)}% used
        {status === 'over' && (
          <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-red-700">
            Over budget
          </span>
        )}
        {status === 'near' && (
          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
            Near limit
          </span>
        )}
      </div>
    </div>
  );
}
