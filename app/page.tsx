'use client'
import { UI } from "./components/UI";
import { Experience } from "./components/Experience";
import { LoadingVideo } from "./components/LoadingVideo";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Suspense, useState } from "react";
import { ChatProvider } from "@/hooks/useChat";
import { Leva } from "leva";
import { Loader } from "@react-three/drei";
import { MessageHistory } from "./components/MessageHistory";
import { CameraDetection } from "./components/CameraDetection";
import { AvatarLockButton } from "./components/AvatarLockButton";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationTest } from "./components/NotificationTest";

export default function Home() {
  const [cameraDetectionEnabled, setCameraDetectionEnabled] = useState(true);
  const [showLoadingVideo, setShowLoadingVideo] = useState(true);
  const [avatarLocked, setAvatarLocked] = useState(false);

  return (
    <main className="h-screen">
      <ChatProvider>
        <NotificationProvider>
          <div className="h-full relative">
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 0, 3], fov: 22 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
            onCreated={(state) => {
              state.gl.toneMappingExposure = 0.72;
            }}
            style={{ zIndex: 1 }}
          >
            <Suspense fallback={null}>
              <Experience 
                onAvatarLoaded={(loaded) => setShowLoadingVideo(!loaded)}
                avatarLocked={avatarLocked}
                onAvatarLockChange={setAvatarLocked}
              />
            </Suspense>
          </Canvas>
          <Loader />
          <Leva hidden />
          <UI 
            hidden={false} 
            cameraDetectionEnabled={cameraDetectionEnabled}
            setCameraDetectionEnabled={setCameraDetectionEnabled}
          />
          <CameraDetection enabled={cameraDetectionEnabled} />
          
          {/* Avatar Lock Button */}
          <AvatarLockButton 
            onLockChange={setAvatarLocked}
            isLocked={avatarLocked}
          />
          
          {/* Notification Test (remove in production) */}
          {/* <NotificationTest /> */}
          
          {/* MessageHistory positioned to avoid avatar overlap */}
          <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
            <MessageHistory />
          </div>
          
          {/* Show loading video until avatar is loaded */}
          {showLoadingVideo && (
            <LoadingVideo 
              onVideoEnd={() => setShowLoadingVideo(false)}
              onVideoError={() => setShowLoadingVideo(false)}
            />
          )}
          </div>
          {/* Uncomment the line below to test colors */}
          {/* <ColorTest /> */}
        </NotificationProvider>
      </ChatProvider>
    </main>
  );
}
