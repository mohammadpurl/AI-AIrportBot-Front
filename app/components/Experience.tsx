'use client'
import {
  CameraControls,
  Environment,
  Text,
  ContactShadows,
} from "@react-three/drei";
import { useChatContext } from "@/hooks/useChat";
import { Suspense, useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { AvatarPositionControls } from "./AvatarPositionControls";
import React from "react";
import type { Vector3, Euler } from "three";

const Dots = (props: React.ComponentProps<'group'>) => {
  const { loading } = useChatContext();
  const [loadingText, setLoadingText] = React.useState("");
  React.useEffect(() => {
    if (!loading) {
      setLoadingText("");
      return;
    }
    const interval = setInterval(() => {
      setLoadingText((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);
  if (!loading) {
    return null;
  }
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

interface ExperienceProps {
  onAvatarLoaded?: (loaded: boolean) => void;
  avatarLocked?: boolean;
  onAvatarLockChange?: (locked: boolean) => void;
}

export const Experience: React.FC<ExperienceProps> = ({ onAvatarLoaded, avatarLocked, onAvatarLockChange }) => {
  const cameraControls = useRef<CameraControls>(null);
  const { cameraZoomed } = useChatContext();
  const avatarRef = useRef<{ isModelLoaded: boolean; position?: Vector3; rotation?: Euler; scale?: Vector3 } | null>(null);
  const [cameraLocked, setCameraLocked] = React.useState(false);

  useEffect(() => {
    cameraControls.current?.setLookAt(0, 2, 5, 0, 1.5, 0);
  }, []);

  useEffect(() => {
    if (cameraZoomed && cameraControls.current) {
      cameraControls.current?.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
    } else {
      cameraControls.current?.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
    }
  }, [cameraZoomed]);

  // Check if avatar is loaded
  useEffect(() => {
    const checkAvatarLoaded = () => {
      if (avatarRef.current?.isModelLoaded) {
        onAvatarLoaded?.(true);
      } else {
        // Check again after a short delay
        setTimeout(checkAvatarLoaded, 100);
      }
    };
    
    // Start checking after a short delay to allow initial load
    const timer = setTimeout(checkAvatarLoaded, 500);
    return () => clearTimeout(timer);
  }, [onAvatarLoaded]);
  return (
    <>
      <CameraControls 
        ref={cameraControls} 
        enabled={!cameraLocked && !avatarLocked}
        makeDefault={!cameraLocked && !avatarLocked}
      />
      {/* استودیویی‌تر برای نور یکنواخت و پوست طبیعی */}
      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr" />
      
      {/* نور طبیعی با کنتراست متعادل */}
      <ambientLight intensity={0.12} color="#f3f2ef" />
      <directionalLight
        position={[2, 4, 2]}
        intensity={0.45}
        color="#ffe6cc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      {/* نور پرکننده سردتر برای خنثی‌سازی گرمی پوست */}
      <directionalLight
        position={[-2, 2, 2]}
        intensity={0.22}
        color="#e8f0ff"
      />
      {/* نور پشت ملایم */}
      <directionalLight position={[0, 2, -3]} intensity={0.12} color="#ffffff" />
      
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      <Avatar ref={avatarRef} />
      <AvatarPositionControls 
        avatarRef={avatarRef} 
        onCameraLockChange={setCameraLocked}
        isLocked={avatarLocked || false}
        onLockChange={onAvatarLockChange || (() => {})}
      />
      {/* سایه تماس ساده و پایدار */}
      <ContactShadows opacity={0.3} blur={2.5} far={4} scale={8} />
    </>
  );
};
