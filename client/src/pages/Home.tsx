import { useEffect, useState } from 'react';
import type { Category, Expense, Member } from '@/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export default function HomePage() {
  
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");

useEffect(() => {
  const timer = setTimeout(() => {
    setLoading(false);
  }, 3000);

  return () => clearTimeout(timer);
}, []);

  if (loading ) {
    return (
      <div className="px-8 py-10 text-gray-500">Loading dashboard…</div>
    );
  }

  return (
    <div className="bg-red-100 min-h-screen flex">
      

      <h1>you are home</h1>
    </div>
  );
}
