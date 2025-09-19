'use client'

import { useControls, button as buttonControl } from "leva";
import { useEffect, useState } from "react";
import type { Vector3, Euler } from "three";

interface AvatarTransformRef {
  isModelLoaded: boolean;
  position?: Vector3;
  rotation?: Euler;
  scale?: Vector3;
}

interface AvatarPositionControlsProps {
  avatarRef: React.RefObject<AvatarTransformRef | null>;
  onCameraLockChange?: (locked: boolean) => void;
  isLocked?: boolean;
  onLockChange?: (locked: boolean) => void;
}

export const AvatarPositionControls: React.FC<AvatarPositionControlsProps> = ({ 
  avatarRef, 
  onCameraLockChange,
  isLocked = false
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const [isAvatarReady, setIsAvatarReady] = useState(false);

  // Check if avatar is ready
  useEffect(() => {
    const checkAvatar = () => {
      if (avatarRef.current && avatarRef.current.position) {
        setIsAvatarReady(true);
      } else {
        setTimeout(checkAvatar, 100);
      }
    };
    checkAvatar();
  }, [avatarRef]);

  // Apply position to avatar when it changes
  useEffect(() => {
    if (isAvatarReady && avatarRef.current && avatarRef.current.position && !isLocked) {
      avatarRef.current.position.set(position.x, position.y, position.z);
    }
  }, [position, isLocked, isAvatarReady, avatarRef]);

  // Apply rotation to avatar when it changes
  useEffect(() => {
    if (isAvatarReady && avatarRef.current && avatarRef.current.rotation && !isLocked) {
      avatarRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    }
  }, [rotation, isLocked, isAvatarReady, avatarRef]);

  // Apply scale to avatar when it changes
  useEffect(() => {
    if (isAvatarReady && avatarRef.current && avatarRef.current.scale && !isLocked) {
      avatarRef.current.scale.set(scale.x, scale.y, scale.z);
    }
  }, [scale, isLocked, isAvatarReady, avatarRef]);

  // Position controls
  useControls("Avatar Position", {
    x: {
      value: position.x,
      min: -10,
      max: 10,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setPosition(prev => ({ ...prev, x: value }))
    },
    y: {
      value: position.y,
      min: -10,
      max: 10,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setPosition(prev => ({ ...prev, y: value }))
    },
    z: {
      value: position.z,
      min: -10,
      max: 10,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setPosition(prev => ({ ...prev, z: value }))
    },
    resetPosition: buttonControl(() => {
      if (!isLocked) {
        setPosition({ x: 0, y: 0, z: 0 });
        setRotation({ x: 0, y: 0, z: 0 });
        setScale({ x: 1, y: 1, z: 1 });
        if (avatarRef.current?.position) {
          avatarRef.current.position.set(0, 0, 0);
        }
        if (avatarRef.current?.rotation) {
          avatarRef.current.rotation.set(0, 0, 0);
        }
        if (avatarRef.current?.scale) {
          avatarRef.current.scale.set(1, 1, 1);
        }
      }
    }),
    savePosition: buttonControl(() => {
      if (!isLocked && avatarRef.current && avatarRef.current.position) {
        const settings = {
          position: {
            x: avatarRef.current.position.x,
            y: avatarRef.current.position.y,
            z: avatarRef.current.position.z
          },
          rotation: {
            x: avatarRef.current.rotation?.x,
            y: avatarRef.current.rotation?.y,
            z: avatarRef.current.rotation?.z
          },
          scale: {
            x: avatarRef.current.scale?.x,
            y: avatarRef.current.scale?.y,
            z: avatarRef.current.scale?.z
          }
        };
        localStorage.setItem('avatarPositionSettings', JSON.stringify(settings));
        console.log('Avatar position saved!', settings);
      }
    }),
    loadPosition: buttonControl(() => {
      if (!isLocked) {
        const savedSettings = localStorage.getItem('avatarPositionSettings');
        if (savedSettings && avatarRef.current && avatarRef.current.position) {
          try {
            const settings = JSON.parse(savedSettings);
            setPosition(settings.position);
            setRotation(settings.rotation);
            setScale(settings.scale);
            
            if (avatarRef.current?.position) {
              avatarRef.current.position.set(settings.position.x, settings.position.y, settings.position.z);
            }
            if (avatarRef.current?.rotation) {
              avatarRef.current.rotation.set(settings.rotation.x, settings.rotation.y, settings.rotation.z);
            }
            if (avatarRef.current?.scale) {
              avatarRef.current.scale.set(settings.scale.x, settings.scale.y, settings.scale.z);
            }
            
            console.log('Avatar position loaded!', settings);
          } catch (error) {
            console.error('Error loading avatar position:', error);
          }
        }
      }
    })
  });

  // Rotation controls
  useControls("Avatar Rotation", {
    x: {
      value: rotation.x,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setRotation(prev => ({ ...prev, x: value }))
    },
    y: {
      value: rotation.y,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setRotation(prev => ({ ...prev, y: value }))
    },
    z: {
      value: rotation.z,
      min: -Math.PI,
      max: Math.PI,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setRotation(prev => ({ ...prev, z: value }))
    }
  });

  // Scale controls
  useControls("Avatar Scale", {
    x: {
      value: scale.x,
      min: 0.1,
      max: 5,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setScale(prev => ({ ...prev, x: value }))
    },
    y: {
      value: scale.y,
      min: 0.1,
      max: 5,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setScale(prev => ({ ...prev, y: value }))
    },
    z: {
      value: scale.z,
      min: 0.1,
      max: 5,
      step: 0.1,
      disabled: isLocked,
      onChange: (value) => !isLocked && setScale(prev => ({ ...prev, z: value }))
    }
  });

  // Camera controls
  useControls("Camera Controls", {
    lockCamera: {
      value: false,
      onChange: (value) => {
        onCameraLockChange?.(value);
      }
    }
  });

  // Load saved position on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('avatarPositionSettings');
    if (savedSettings && avatarRef.current && avatarRef.current.position) {
      try {
        const settings = JSON.parse(savedSettings);
        setPosition(settings.position);
        setRotation(settings.rotation);
        setScale(settings.scale);
        
        if (avatarRef.current?.position) {
          avatarRef.current.position.set(settings.position.x, settings.position.y, settings.position.z);
        }
        if (avatarRef.current?.rotation) {
          avatarRef.current.rotation.set(settings.rotation.x, settings.rotation.y, settings.rotation.z);
        }
        if (avatarRef.current?.scale) {
          avatarRef.current.scale.set(settings.scale.x, settings.scale.y, settings.scale.z);
        }
        
        console.log('Avatar position auto-loaded on startup!', settings);
      } catch (error) {
        console.error('Error auto-loading avatar position:', error);
      }
    }
  }, [avatarRef]);

  return null; // This component only provides controls, doesn't render anything
};