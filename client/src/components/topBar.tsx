import { IoMdMenu } from 'react-icons/io';
import { useLocation } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { useState } from 'react';
import ProfileDropdown from './profileDropdown';

type TopBarProps = {
  onMenuClick: () => void;
};

const TopBar = ({ onMenuClick }: TopBarProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const { pathname } = useLocation();
  const isProfilePage = pathname === '/profile';

  return (
    <>
      <header className="w-full bg-surface border-b border-line px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="w-9 h-9 flex items-center justify-center rounded-md text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
        >
          <IoMdMenu size={20} />
        </button>

        <h1 className="text-sm font-semibold tracking-tight text-text-primary">
          Team Budget Tracker
        </h1>

        <nav className="hidden sm:flex gap-6 items-center">
          <a
            href="#"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Home
          </a>
          <a
            href="#"
            className="text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            About
          </a>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-line text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors"
            >
              <UserRound size={18} strokeWidth={1.75} />
            </button>

            <ProfileDropdown
              open={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
            />
          </div>
        </nav>
      </header>

      {isProfilePage && (
        <header className="w-full bg-surface border-b border-line px-4 py-2.5 flex items-center justify-end">
          <nav className="hidden sm:flex gap-6 items-center">
            <a
              href="#"
              className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
            >
              Organizations
            </a>
            <a
              href="#"
              className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted hover:text-text-primary transition-colors"
            >
              Teams
            </a>
          </nav>
        </header>
      )}
    </>
  );
};

export default TopBar;