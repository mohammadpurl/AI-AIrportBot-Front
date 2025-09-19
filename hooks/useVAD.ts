import { useEffect, useRef, useState } from "react";
import { useChatContext } from "./useChat";

export function useVAD(options = { threshold: 0.15 }) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { isAvatarTalking, isProcessing } = useChatContext();
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isAvatarTalking || isProcessing) {
      setIsSpeaking(false);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.suspend().catch(() => {});
      }
      return;
    }

    if (isInitializedRef.current) {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
      return;
    }

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1,
          },
        });

        mediaStreamRef.current = stream;
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        const lowpassFilter = audioContext.createBiquadFilter();
        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.value = 1800;
        lowpassFilter.Q.value = 1.0;

        const highpassFilter = audioContext.createBiquadFilter();
        highpassFilter.type = "highpass";
        highpassFilter.frequency.value = 400;

        analyser.fftSize = 1024;
        source.connect(highpassFilter);
        highpassFilter.connect(lowpassFilter);
        lowpassFilter.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (isAvatarTalking || isProcessing) {
            setIsSpeaking(false);
            return;
          }

          analyser.getByteFrequencyData(data);
          const volume = data.reduce((a, b) => a + b) / data.length / 256;

          setIsSpeaking(volume > options.threshold);

          requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (e) {
        console.error("VAD initialization failed:", e);
      }

      isInitializedRef.current = true;
    };

    init();

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      isInitializedRef.current = false;
    };
  }, [isAvatarTalking, isProcessing, options.threshold]);

  return { isSpeaking };
}