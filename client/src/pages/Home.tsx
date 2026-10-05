import { useEffect, useState } from 'react';
import type { Category, Expense, Member } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function HomePage() {
  
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");


  if (loading ) {
    return (
      <div className="px-8 py-10 text-gray-500">Loading dashboard…</div>
    );
  }

  return (
    <>
      <div>
            <h2 className="text-3xl font-bold">
              Home
            </h2>

            <p className="mt-2 text-gray-600">
              you are Home.
            </p>
          </div>
    </>
  );
}
