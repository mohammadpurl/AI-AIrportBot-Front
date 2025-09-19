'use client'

import { useNotificationContext } from '../app/contexts/NotificationContext';
import { useCallback } from 'react';

export const useApiNotification = () => {
  const { addNotification } = useNotificationContext();

  const showSuccess = useCallback((message: string, title: string = 'موفق') => {
    addNotification({
      type: 'success',
      title,
      message,
      duration: 4000,
    });
  }, [addNotification]);

  const showError = useCallback((message: string, title: string = 'خطا') => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 6000,
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title: string = 'اطلاعات') => {
    addNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title: string = 'هشدار') => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  }, [addNotification]);

  const handleApiResponse = useCallback((response: any, successMessage?: string) => {
    if (response?.status === 'success' || response?.success) {
      showSuccess(successMessage || response.message || 'عملیات با موفقیت انجام شد');
    } else if (response?.status === 'error' || response?.error) {
      showError(response.message || response.error || 'خطایی رخ داد');
    } else {
      showInfo(response.message || 'درخواست ارسال شد');
    }
  }, [showSuccess, showError, showInfo]);

  const handleApiError = useCallback((error: any, defaultMessage: string = 'خطا در ارتباط با سرور') => {
    let message = defaultMessage;
    
    if (error?.response?.data?.message) {
      message = error.response.data.message;
    } else if (error?.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    showError(message);
  }, [showError]);

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    handleApiResponse,
    handleApiError,
  };
};
