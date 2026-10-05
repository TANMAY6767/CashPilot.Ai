import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './topBar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(
    () => window.localStorage.getItem('cashflow-theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    window.localStorage.setItem('cashflow-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <div className="app-shell h-screen flex flex-col bg-app text-text-primary">
      <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

      <Sidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDark={isDark}
        setIsDark={setIsDark}
      />

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}