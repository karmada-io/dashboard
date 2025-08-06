import React from 'react';
import { useGlobalStore } from '../../stores/globalStore';
import { Bell, Sun, Moon, Monitor } from 'lucide-react';
import Button from '../ui/Button';

const Header: React.FC = () => {
  const { theme, setTheme, notifications } = useGlobalStore();

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'auto'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.id.includes('read')).length;

  return (
    <header className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold text-secondary-900 dark:text-white">
          Multi-Cloud Kubernetes Management
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="relative"
          title={`Switch theme (current: ${theme})`}
        >
          {getThemeIcon()}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;