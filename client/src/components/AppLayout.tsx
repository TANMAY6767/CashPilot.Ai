import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './topBar';
import { OrganizationProvider } from '@/context/OrganizationContext';

export default function AppLayout() {
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem('cashflow-theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('cashflow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <OrganizationProvider>
    <div className="app-frame">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isDark={isDark} setIsDark={setIsDark} />
      <div className="app-main">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="app-content"><Outlet /></main>
      </div>
    </div>
    </OrganizationProvider>
  );
}
