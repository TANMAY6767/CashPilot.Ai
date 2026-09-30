import { useEffect, useState } from 'react';
import type { Category, Expense, Member } from '@/types';
import PageHeader from '@/components/PageHeader';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function DashboardPage() {
  
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");

useEffect(() => {
  const timer = setTimeout(() => {
    setLoading(false);
  }, 3000);

  return () => clearTimeout(timer);
}, []);

  // if (loading ) {
  //   return (
  //     <div className="px-8 py-10 text-gray-500">Loading dashboard…</div>
  //   );
  // }

  return (
    <div className="bg-red-100 min-h-screen flex">
      <aside className="w-64 bg-white border-r p-4">

        <h1 className="text-2xl font-bold mb-8">
          Casherly
        </h1>

        <div className='space-y-2'>
          <button
            onClick={() => setActivePage("dashboard")}
            className={`w-full text-left px-4 py-3 rounded-lg ${
              activePage === "dashboard"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => setActivePage("Organizations")}
            className={`w-full text-left px-4 py-3 rounded-lg ${
              activePage === "Organizations"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Organizations
          </button>

          <button
            onClick={() => setActivePage("teams")}
            className={`w-full text-left px-4 py-3 rounded-lg ${
              activePage === "teams"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Teams
          </button>

          <button
            onClick={() => setActivePage("transactions")}
            className={`w-full text-left px-4 py-3 rounded-lg ${
              activePage === "transactions"
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Transactions
          </button>

        </div>

      </aside>

      <main className="flex-1 p-8">
            {activePage === "dashboard" && (
          <div>
            <h2 className="text-3xl font-bold">
              Dashboard
            </h2>

            <p className="mt-2 text-gray-600">
              Welcome to your dashboard.
            </p>
          </div>
        )}

        {activePage === "teams" && (
          <div>
            <h2 className="text-3xl font-bold">
              Teams
            </h2>

            <p className="mt-2 text-gray-600">
              Manage your teams here.
            </p>
          </div>
        )}

        {activePage === "budgets" && (
          <div>
            <h2 className="text-3xl font-bold">
              Budgets
            </h2>

            <p className="mt-2 text-gray-600">
              Manage your budgets here.
            </p>
          </div>
        )}

        {activePage === "transactions" && (
          <div>
            <h2 className="text-3xl font-bold">
              Transactions
            </h2>

            <p className="mt-2 text-gray-600">
              View your transactions here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
