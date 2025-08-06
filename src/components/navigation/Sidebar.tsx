import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGlobalStore } from '../../stores/globalStore';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard,
  Server,
  Package,
  Shield,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Terminal,
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and metrics',
  },
  {
    name: 'Clusters',
    href: '/clusters',
    icon: Server,
    description: 'Manage member clusters',
  },
  {
    name: 'Workloads',
    href: '/workloads',
    icon: Package,
    description: 'Deployments, pods, services',
  },
  {
    name: 'Policies',
    href: '/policies',
    icon: Shield,
    description: 'Propagation and override policies',
  },
  {
    name: 'Monitoring',
    href: '/monitoring',
    icon: Activity,
    description: 'Metrics and observability',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'System configuration',
  },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, toggleTerminal } = useGlobalStore();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200 dark:border-secondary-700">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-secondary-900 dark:text-white">
                  Karmada
                </h1>
                <span className="text-xs text-secondary-500 dark:text-secondary-400">
                  Dashboard
                </span>
              </div>
            </div>
          )}
          
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white'
                )}
                title={sidebarCollapsed ? `${item.name} - ${item.description}` : undefined}
              >
                <item.icon
                  className={cn(
                    'flex-shrink-0 h-5 w-5',
                    sidebarCollapsed ? 'mx-auto' : 'mr-3'
                  )}
                />
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.name}</span>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                      {item.description}
                    </p>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Terminal Toggle */}
        <div className="px-2 py-2 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={toggleTerminal}
            className={cn(
              'w-full group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-white'
            )}
            title={sidebarCollapsed ? 'Open Terminal' : undefined}
          >
            <Terminal
              className={cn(
                'flex-shrink-0 h-5 w-5',
                sidebarCollapsed ? 'mx-auto' : 'mr-3'
              )}
            />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="truncate">Terminal</span>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  Karmada CLI access
                </p>
              </div>
            )}
          </button>
        </div>

        {/* User section */}
        <div className="px-2 py-2 border-t border-secondary-200 dark:border-secondary-700">
          {!sidebarCollapsed && user && (
            <div className="px-2 py-2 mb-2">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                    {user.roles.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className={cn(
              'w-full group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 hover:text-danger-700'
            )}
            title={sidebarCollapsed ? 'Sign out' : undefined}
          >
            <LogOut
              className={cn(
                'flex-shrink-0 h-5 w-5',
                sidebarCollapsed ? 'mx-auto' : 'mr-3'
              )}
            />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>

      {/* Mobile backdrop */}
      {!sidebarCollapsed && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/50"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;