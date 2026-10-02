import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Sparkles,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/expenses', label: 'Transactions', icon: Receipt },
  { to: '/organization', label: 'Organization', icon: Sparkles },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(
    () => window.localStorage.getItem('cashflow-theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('cashflow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell flex min-h-screen bg-gray-50 text-gray-800">
      <aside className="app-sidebar w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold tracking-tight">Team Budget</h1>
          <p className="text-xs text-gray-400">Tracker</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="px-2 py-1 mb-2">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-pressed={isDark}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
          >
            <span className="flex items-center gap-3">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Light theme' : 'Dark theme'}
            </span>
            <span
              aria-hidden="true"
              className={`theme-switch ${isDark ? 'theme-switch-on' : ''}`}
            >
              <span className="theme-switch-thumb" />
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
