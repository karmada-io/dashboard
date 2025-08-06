import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GlobalState {
  // UI State
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'zh';
  
  // Terminal
  terminalOpen: boolean;
  
  // Loading states
  isLoading: boolean;
  loadingMessage: string;
  
  // Notifications
  notifications: Notification[];
  
  // Real-time updates
  realTimeEnabled: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: 'en' | 'zh') => void;
  toggleTerminal: () => void;
  setTerminalOpen: (open: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setRealTimeEnabled: (enabled: boolean) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  autoClose?: boolean;
  duration?: number;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      theme: 'light',
      language: 'en',
      terminalOpen: false,
      isLoading: false,
      loadingMessage: '',
      notifications: [],
      realTimeEnabled: true,

      // Actions
      toggleSidebar: () => 
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
      
      setTheme: (theme: 'light' | 'dark' | 'auto') => {
        set({ theme });
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // Auto theme - check system preference
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      
      setLanguage: (language: 'en' | 'zh') =>
        set({ language }),
      
      toggleTerminal: () =>
        set((state) => ({ terminalOpen: !state.terminalOpen })),
      
      setTerminalOpen: (terminalOpen: boolean) =>
        set({ terminalOpen }),
      
      setLoading: (isLoading: boolean, loadingMessage: string = '') =>
        set({ isLoading, loadingMessage }),
      
      addNotification: (notification: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 15);
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
          autoClose: notification.autoClose ?? true,
          duration: notification.duration ?? 5000,
        };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));
        
        // Auto remove notification if autoClose is enabled
        if (newNotification.autoClose) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }
      },
      
      removeNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      
      clearNotifications: () =>
        set({ notifications: [] }),
      
      setRealTimeEnabled: (realTimeEnabled: boolean) =>
        set({ realTimeEnabled }),
    }),
    {
      name: 'global-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        language: state.language,
        realTimeEnabled: state.realTimeEnabled,
      }),
    }
  )
);

export default useGlobalStore;