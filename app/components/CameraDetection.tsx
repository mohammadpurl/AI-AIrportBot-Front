'use client'

import { useChatContext } from "@/hooks/useChat";
import { useEffect, useRef, useState } from "react";
import * as faceapi from 'face-api.js';

interface CameraDetectionProps {
  enabled?: boolean;
  onStart?: () => void; // Optional prop to trigger an existing button or action
}

export const CameraDetection = ({ enabled = true, onStart }: CameraDetectionProps) => {
  const { isSessionActive, startSession, getIntroduction, language } = useChatContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isDetecting, setIsDetecting] = useState(false);
  const [personDetected, setPersonDetected] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const presenceMsRef = useRef(0); // Track presence duration

  // Load face-api.js tinyFaceDetector model
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load face-api models:", error);
      }
    };
    if (enabled) {
      loadModels();
    }
  }, [enabled]);

  // Initialize camera
  const initializeCamera = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permission.state);
        if (permission.state === 'denied') {
          return;
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
          facingMode: 'user'
        }
      });
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsDetecting(true);
    } catch (error) {
      console.error("Failed to initialize camera:", error);
      setCameraPermission('denied');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsDetecting(false);
    setPersonDetected(false);
    presenceMsRef.current = 0;
  };

  // Detect person using tinyFaceDetector
  const detectPerson = async () => {
    if (!videoRef.current || !modelsLoaded || !isDetecting) return false;

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return false;
    }

    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const detection = await faceapi.detectSingleFace(video, options);
      return !!detection; // Returns true if a face is detected
    } catch (error) {
      console.error("Detection error:", error);
      return false;
    }
  };

  // Detection loop
  useEffect(() => {
    if (!isDetecting || isSessionActive || !modelsLoaded) return;

    detectionIntervalRef.current = setInterval(async () => {
      const hasPerson = await detectPerson();
      if (hasPerson) {
        setPersonDetected(true);
        presenceMsRef.current += 100; // Increment by interval duration (100ms)
        console.log(`Presence time: ${presenceMsRef.current}ms`); // Debug presenceMsRef

        if (presenceMsRef.current >= 4000 && !isSessionActive) {
          // Trigger audio event (if needed)
          const enableAudioEvent = new Event('click');
          document.dispatchEvent(enableAudioEvent);
          
          // Start session
          startSession();
          getIntroduction();
          
          // Trigger external onStart if provided
          if (onStart) {
            onStart();
          }
          
          // Stop detection after starting session
          setIsDetecting(false);
          if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
          }
        }
      } else {
        setPersonDetected(false);
        presenceMsRef.current = 0; // Reset presence timer if no person detected
      }
    }, 100); // Check every 100ms

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [isDetecting, isSessionActive, modelsLoaded, startSession, getIntroduction, onStart]);

  // Initialize camera when component mounts
  useEffect(() => {
    if (enabled && !isSessionActive && cameraPermission !== 'denied' && modelsLoaded) {
      initializeCamera();
    }

    return () => {
      stopCamera();
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [enabled, isSessionActive, cameraPermission, modelsLoaded]);

  if (!enabled) return null;

  return (
    <>
      {/* Top-right circular camera preview */}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/40 shadow-lg bg-black/30 backdrop-blur-sm">
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="fixed top-40 right-40 translate-x-32 z-50 bg-black bg-opacity-75 rounded-lg p-2 text-white text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>
            {language === "fa" ? "تشخیص شخص" : "Person Detection"}
          </span>
        </div>
        {isDetecting && (
          <div className="mt-1">
            <div className="flex items-center gap-1">
              <span>{language === "fa" ? "وضعیت:" : "Status:"}</span>
              <span className={personDetected ? 'text-green-400' : 'text-red-400'}>
                {personDetected 
                  ? (language === "fa" ? "شخص تشخیص داده شد" : "Person Detected")
                  : (language === "fa" ? "شخصی یافت نشد" : "No Person")
                }
              </span>
            </div>
            <div className="mt-1">
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((presenceMsRef.current / 4000) * 100, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs">
                {language === "fa" 
                  ? `${(presenceMsRef.current / 1000).toFixed(1)}/4 ثانیه`
                  : `${(presenceMsRef.current / 1000).toFixed(1)}/4s`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden processing video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            videoRef.current.play();
          }
        }}
      />
    </>
  );
};