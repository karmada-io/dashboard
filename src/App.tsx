import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Store hooks
import { useAuthStore } from './stores/authStore';
import { useGlobalStore } from './stores/globalStore';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClustersPage from './pages/clusters/ClustersPage';
import WorkloadsPage from './pages/workloads/WorkloadsPage';
import PoliciesPage from './pages/policies/PoliciesPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import SettingsPage from './pages/settings/SettingsPage';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const { setTheme, theme } = useGlobalStore();

  // Initialize app
  useEffect(() => {
    // Check authentication on app start
    checkAuth();
    
    // Apply saved theme
    setTheme(theme);
    
    // Set up system theme change listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      if (theme === 'auto') {
        setTheme('auto'); // This will trigger the theme application logic
      }
    };
    
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, [checkAuth, setTheme, theme]);

  // Show loading spinner during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 transition-colors duration-200">
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            } />

            {/* Protected Dashboard Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="clusters/*" element={<ClustersPage />} />
              <Route path="workloads/*" element={<WorkloadsPage />} />
              <Route path="policies/*" element={<PoliciesPage />} />
              <Route path="monitoring/*" element={<MonitoringPage />} />
              <Route path="settings/*" element={<SettingsPage />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
                border: '1px solid var(--toast-border)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;