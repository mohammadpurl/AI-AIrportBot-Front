'use client'

import React from 'react';
import { useApiNotification } from '@/hooks/useApiNotification';

export const NotificationTest: React.FC = () => {
  const { showSuccess, showError, showInfo, showWarning } = useApiNotification();

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      <button
        onClick={() => showSuccess('عملیات با موفقیت انجام شد!', 'موفق')}
        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
      >
        Success
      </button>
      <button
        onClick={() => showError('خطایی رخ داد!', 'خطا')}
        className="bg-red-500 text-white px-4 py-2 rounded mr-2"
      >
        Error
      </button>
      <button
        onClick={() => showInfo('اطلاعات جدید دریافت شد', 'اطلاعات')}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
      >
        Info
      </button>
      <button
        onClick={() => showWarning('هشدار: این عمل قابل بازگشت نیست', 'هشدار')}
        className="bg-yellow-500 text-white px-4 py-2 rounded"
      >
        Warning
      </button>
    </div>
  );
};
