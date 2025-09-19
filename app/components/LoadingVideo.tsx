'use client'
import React, { useState, useRef, useEffect } from 'react';

interface LoadingVideoProps {
  onVideoEnd?: () => void;
  onVideoError?: () => void;
}

export const LoadingVideo: React.FC<LoadingVideoProps> = ({ 
  onVideoEnd, 
  onVideoError 
}) => {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
    };

    const handleEnded = () => {
      setIsVideoEnded(true);
      onVideoEnd?.();
    };

    const handleError = () => {
      console.error('Video loading error');
      onVideoError?.();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onVideoEnd, onVideoError]);

  // Hide video when it ends
  if (isVideoEnded) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <div className="relative w-full h-full max-w-4xl max-h-4xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          preload="auto"
          loop={false}
        >
          <source src="/IMG_8052.MP4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Loading overlay */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">در حال بارگذاری...</p>
            </div>
          </div>
        )}
        
        {/* Video controls overlay (optional) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white text-sm">در حال بارگذاری آواتار...</p>
          </div>
        </div>
      </div>
    </div>
  );
};
