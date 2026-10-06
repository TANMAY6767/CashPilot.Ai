import { Menu, Search, Bell, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const labels: Record<string, string> = { '': 'Overview', dashboard: 'Overview', organization: 'Organizations', teams: 'Teams & budgets', expenses: 'Transactions', settings: 'Settings', profile: 'My profile' };

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const parts = pathname.split('/').filter(Boolean);
  const current = labels[parts[0]] || 'Organization';
  const initials =
  user?.name?.trim().slice(0, 2).toUpperCase() || 'JD';
  return <header className="topbar">
    <button className="icon-button mobile-menu" onClick={onMenuClick} aria-label="Open menu"><Menu size={20}/></button>
    <div className="breadcrumbs"><Link to="/">Workspace</Link><ChevronRight size={14}/><span>{current}</span>{parts.length > 1 && <><ChevronRight size={14}/><span className="crumb-current">Details</span></>}</div>
    <div className="topbar-actions">
      <button className="search-trigger"><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button>
      <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18}/><i/></button>
      <div className="topbar-divider"/>
      <Link to="/profile" className="avatar avatar-indigo top-avatar" aria-label="My profile">{initials}</Link>
    </div>
  </header>;
}
