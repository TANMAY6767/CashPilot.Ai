import type { Dispatch, SetStateAction } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Sparkles,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { HiX } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/expenses', label: 'Transactions', icon: Receipt },
  { to: '/organization', label: 'Organization', icon: Sparkles },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
};

export default function Sidebar({ open, onClose, isDark, setIsDark }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 flex flex-col bg-surface border-r border-line transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-text-primary">
              Team Budget
            </h1>
            <p className="text-xs text-text-faint">Tracker</p>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:bg-subtle hover:text-text-primary transition-colors"
          >
            <HiX size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-muted text-text-primary font-medium'
                    : 'text-text-secondary hover:bg-subtle hover:text-text-primary',
                ].join(' ')
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-line p-3">
          <div className="px-2 py-1 mb-2">
            <p className="text-sm font-medium truncate text-text-primary">
              {user?.name}
            </p>
            <p className="text-xs text-text-faint truncate">{user?.email}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsDark((c) => !c)}
            aria-pressed={isDark}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-subtle hover:text-text-primary"
          >
            <span className="flex items-center gap-3">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
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
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}