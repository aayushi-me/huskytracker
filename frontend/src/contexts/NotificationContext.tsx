/**
 * NotificationContext
 * Provides global access to notification refresh function
 */

import { createContext, useContext, ReactNode } from 'react';

interface NotificationContextType {
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotificationRefresh() {
  const context = useContext(NotificationContext);
  if (!context) {
    // Return a no-op function if context is not available (e.g., outside MainLayout)
    return {
      refreshNotifications: async () => {
        console.warn('NotificationContext not available');
      },
    };
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
  refreshNotifications: () => Promise<void>;
}

export function NotificationProvider({ children, refreshNotifications }: NotificationProviderProps) {
  return (
    <NotificationContext.Provider value={{ refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

