'use client'
import { useState, useEffect } from 'react';

interface STTStatusProps {
  isPermissionDenied: boolean;
  isHTTPS: boolean;
  isSupported: boolean;
  networkErrorCount: number;
  onRequestPermission: () => Promise<boolean>;
  onResetPermission: () => void;
}

export const STTStatus = ({
  isPermissionDenied,
  isHTTPS,
  isSupported,
  networkErrorCount,
  onRequestPermission,
  onResetPermission
}: STTStatusProps) => {
  const [showStatus, setShowStatus] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    // Show status if there are any issues
    if (isPermissionDenied || !isHTTPS || !isSupported || networkErrorCount > 0) {
      setShowStatus(true);
    }
  }, [isPermissionDenied, isHTTPS, isSupported, networkErrorCount]);

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        onResetPermission();
        setShowStatus(false);
      }
    } catch (error) {
      console.error("Failed to request permission:", error);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  if (!showStatus) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        maxWidth: '300px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>وضعیت تشخیص گفتار</h3>
        <button
          onClick={() => setShowStatus(false)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        {!isHTTPS && (
          <div style={{ color: '#d32f2f', marginBottom: '8px' }}>
            ⚠️ برای استفاده از تشخیص گفتار، لطفاً از HTTPS استفاده کنید
          </div>
        )}
        
        {!isSupported && (
          <div style={{ color: '#d32f2f', marginBottom: '8px' }}>
            ⚠️ مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند
          </div>
        )}
        
        {isPermissionDenied && (
          <div style={{ color: '#d32f2f', marginBottom: '8px' }}>
            ⚠️ مجوز دسترسی به میکروفون داده نشده است
          </div>
        )}
        
        {networkErrorCount > 0 && (
          <div style={{ color: '#f57c00', marginBottom: '8px' }}>
            ⚠️ خطای شبکه ({networkErrorCount} بار)
          </div>
        )}
      </div>

      {isPermissionDenied && (
        <div>
          <button
            onClick={handleRequestPermission}
            disabled={isRequestingPermission}
            style={{
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              cursor: isRequestingPermission ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            {isRequestingPermission ? 'در حال درخواست...' : 'درخواست مجوز میکروفون'}
          </button>
          
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            یا روی آیکون میکروفون در نوار آدرس کلیک کنید
          </div>
        </div>
      )}

      {!isHTTPS && (
        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
          برای استفاده از HTTPS، لطفاً از دامنه‌ای با گواهی SSL استفاده کنید
        </div>
      )}
    </div>
  );
};

