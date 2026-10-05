import { NavLink, useNavigate } from 'react-router-dom';
import { CircleUserRound, Sparkles, LogOut } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  end?: boolean;
};

const navItems: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: CircleUserRound, end: true },
  { to: '/insights', label: 'Insights', icon: Sparkles, end: true },
  { to: '/settings', label: 'settings', icon: Sparkles, end: true },
];

type ProfileDropdownProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileDropdown({ open, onClose }: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-line bg-surface shadow-lg z-50 overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 border-b border-line">
        <p className="text-sm font-medium truncate text-text-primary">
          {user?.name}
        </p>
        <p className="mt-0.5 text-xs text-text-faint truncate">
          {user?.email}
        </p>
      </div>

      {/* Nav links */}
      <nav className="py-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-4 py-2 text-sm transition-colors',
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

      {/* Logout */}
      <div className="border-t border-line py-1">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );
}