import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import TeamsPage from '@/pages/TeamsPage';
import Home from '@/pages/Home';
import TeamPage from '@/pages/TeamsPage';
import OrganizationPage from '@/pages/OrganizationPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionPage from '@/pages/TransactionPage';

export default function App() {
  return (
     <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="expenses" element={<TransactionPage />} />
            <Route path="organization" element={<OrganizationPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
