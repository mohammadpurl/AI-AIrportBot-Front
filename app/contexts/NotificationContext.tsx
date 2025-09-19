'use client'

import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useNotification, NotificationContainer, NotificationData } from '../components/Notification';

interface NotificationContextType {
  addNotification: (notification: Omit<NotificationData, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { notifications, addNotification, removeNotification, clearAll } = useNotification();

  const stableAddNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    addNotification(notification);
  }, [addNotification]);

  const stableRemoveNotification = useCallback((id: string) => {
    removeNotification(id);
  }, [removeNotification]);

  const stableClearAll = useCallback(() => {
    clearAll();
  }, [clearAll]);

  return (
    <NotificationContext.Provider value={{ 
      addNotification: stableAddNotification, 
      removeNotification: stableRemoveNotification, 
      clearAll: stableClearAll 
    }}>
      {children}
      <NotificationContainer 
        notifications={notifications} 
        onClose={stableRemoveNotification} 
      />
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};
