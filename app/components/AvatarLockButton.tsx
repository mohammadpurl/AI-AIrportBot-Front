'use client'

import { useState, useEffect } from 'react';
import { useControls } from 'leva';

interface AvatarLockButtonProps {
  onLockChange: (locked: boolean) => void;
  isLocked: boolean;
}

export const AvatarLockButton: React.FC<AvatarLockButtonProps> = ({ 
  onLockChange, 
  isLocked 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + L: Toggle lock state
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault();
        onLockChange(!isLocked);
      }
      // Ctrl + H: Toggle visibility
      if (event.ctrlKey && event.key === 'h') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, onLockChange]);

  // Leva controls for the button
  useControls("Avatar Lock Controls", {
    toggleLock: {
      value: false,
      onChange: () => {
        onLockChange(!isLocked);
      }
    },
    hideButton: {
      value: false,
      onChange: () => {
        setIsVisible(false);
      }
    },
    showButton: {
      value: false,
      onChange: () => {
        setIsVisible(true);
      }
    }
  });

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => onLockChange(!isLocked)}
        className={`
          px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${isLocked 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
            : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
          }
        `}
        title={`${isLocked ? 'Unlock' : 'Lock'} Avatar Position (Ctrl+L to toggle lock, Ctrl+H to hide)`}
      >
        {isLocked ? '🔒 Unlock Avatar' : '🔓 Lock Avatar'}
      </button>
      
      {/* Keyboard shortcut hint */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Ctrl+L: Toggle Lock | Ctrl+H: Hide
      </div>
    </div>
  );
};
