import { useEffect, useRef } from "react";
import { useVAD } from "./useVAD";
import { useChatContext } from "./useChat";
import { Language } from "./useChat";


// SpeechRecognition types
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}


function normalizeText(text: string) {
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}

// تابع محاسبه similarity با استفاده از Levenshtein Distance
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0) return 0;
  if (str2.length === 0) return 0;

  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
}

// تابع محاسبه similarity با استفاده از Jaccard Similarity
function calculateJaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 100;
  
  return Math.round((intersection.size / union.size) * 100);
}

// تابع ترکیبی برای محاسبه similarity
function calculateCombinedSimilarity(str1: string, str2: string): number {
  const levenshteinSimilarity = calculateSimilarity(str1, str2);
  const jaccardSimilarity = calculateJaccardSimilarity(str1, str2);
  
  // وزن‌دهی: 60% Levenshtein + 40% Jaccard
  const combinedSimilarity = (levenshteinSimilarity * 0.6) + (jaccardSimilarity * 0.4);
  
  return Math.round(combinedSimilarity);
}



export function useAutoSTT(
  enabled: boolean,
  onTranscript: (text: string) => void,
  isProcessing: boolean,
  language: Language = "fa"
) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isActiveRef = useRef(false);
  const networkErrorCountRef = useRef(0);
  const lastNetworkErrorRef = useRef<number>(0);
  const permissionDeniedRef = useRef(false);
  const { messages, isAvatarTalking } = useChatContext();
  const messagesRef = useRef(messages);

  // فراخوانی useVAD در سطح بالای هوک
  const { isSpeaking } = useVAD({ threshold: 0.015 });

  // تابع درخواست مجوز میکروفون
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("[STT] MediaDevices API not supported");
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[STT] Microphone permission granted");
      
      // Stop the stream immediately as we only needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.warn("[STT] Microphone permission denied:", error);
      return false;
    }
  };

  // تابع بررسی پشتیبانی از Speech Recognition
  const checkSpeechRecognitionSupport = (): boolean => {
    if (typeof window === 'undefined') return false;
    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    return !!SpeechRecognition;
  };

  // تابع بررسی HTTPS
  const checkHTTPS = (): boolean => {
    if (typeof window === 'undefined') return true; // avoid SSR crash; treat as ok
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // بررسی‌های اولیه
    if (!checkHTTPS()) {
      console.warn("[STT] HTTPS required for Speech Recognition. Current protocol:", window.location.protocol);
      return;
    }

    if (!checkSpeechRecognitionSupport()) {
      console.warn("[STT] Speech Recognition API not supported in this browser");
      return;
    }

    // Check if STT should be disabled due to network errors
    const shouldDisableDueToNetworkErrors = networkErrorCountRef.current >= 3;
    const timeSinceLastNetworkError = Date.now() - lastNetworkErrorRef.current;
    const networkErrorCooldown = timeSinceLastNetworkError < 30000; // 30 seconds cooldown
    
    if (!enabled || isProcessing || isAvatarTalking || (shouldDisableDueToNetworkErrors && networkErrorCooldown) || permissionDeniedRef.current) {
      if (recognitionRef.current && isActiveRef.current) {
        recognitionRef.current.stop();
        isActiveRef.current = false;
        console.log("[STT] Stopped due to disabled, processing, avatar talking, network errors, or permission denied");
      }
      return;
    }

    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition API not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    isActiveRef.current = false;

    // تنظیم زبان بر اساس انتخاب کاربر
    recognition.lang = language === "fa" ? "fa-IR" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isActiveRef.current = true;
      console.log("[STT] Started");
    };

    recognition.onend = () => {
      isActiveRef.current = false;
      console.log("[STT] Ended");
    };

    recognition.onerror = async (e: Event) => {
      const errorEvent = e as SpeechRecognitionErrorEvent;
      console.warn("[STT] Error:", errorEvent.error, errorEvent.message);
      isActiveRef.current = false;
      
      // Handle specific error types
      switch (errorEvent.error) {
        case 'network':
          console.warn("[STT] Network error - speech recognition service unavailable");
          networkErrorCountRef.current++;
          lastNetworkErrorRef.current = Date.now();
          
          // If we have too many network errors, disable STT temporarily
          if (networkErrorCountRef.current >= 3) {
            console.warn("[STT] Too many network errors, disabling STT temporarily");
            // Reset counter after 30 seconds
            setTimeout(() => {
              networkErrorCountRef.current = 0;
              console.log("[STT] Network error counter reset, STT can be re-enabled");
            }, 30000);
          }
          break;
        case 'not-allowed':
          console.warn("[STT] Permission denied - microphone access not allowed");
          permissionDeniedRef.current = true;
          
          // Try to request permission
          const hasPermission = await requestMicrophonePermission();
          if (hasPermission) {
            permissionDeniedRef.current = false;
            console.log("[STT] Permission granted, STT can be re-enabled");
          } else {
            console.warn("[STT] Permission still denied, STT disabled");
            // Show user-friendly message
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
              alert("برای استفاده از تشخیص گفتار، لطفاً مجوز دسترسی به میکروفون را بدهید و صفحه را refresh کنید.");
            }
          }
          break;
        case 'no-speech':
          console.log("[STT] No speech detected - this is normal");
          break;
        case 'audio-capture':
          console.warn("[STT] Audio capture error - microphone not available");
          permissionDeniedRef.current = true;
          break;
        case 'service-not-allowed':
          console.warn("[STT] Service not allowed - HTTPS required or browser not supported");
          if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            alert("برای استفاده از تشخیص گفتار، لطفاً از HTTPS استفاده کنید یا در localhost اجرا کنید.");
          }
          break;
        default:
          console.warn("[STT] Unknown error:", errorEvent.error);
      }
      
      // Only restart if it's not a network error, permission error, or service error
      if (errorEvent.error !== 'network' && 
          errorEvent.error !== 'not-allowed' && 
          errorEvent.error !== 'audio-capture' &&
          errorEvent.error !== 'service-not-allowed' && 
          enabled) {
        setTimeout(() => {
          if (enabled && !isProcessing && !isAvatarTalking && !permissionDeniedRef.current) {
            console.log("[STT] Restarting after error:", errorEvent.error);
            try {
              recognition.start();
            } catch (restartError) {
              console.warn("[STT] Failed to restart:", restartError);
            }
          }
        }, 1000);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isProcessing || isAvatarTalking) {
        console.log("[STT] Ignored result - processing or avatar talking");
        return;
      }

      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.length > 0) {

        const userText = normalizeText(finalTranscript);
        const currentMessages = messagesRef.current;
        const lastAvatarMessage =
          currentMessages.length > 0 && currentMessages[currentMessages.length - 1].sender === "AVATAR"
            ? currentMessages[currentMessages.length - 1]
            : null;

        if (lastAvatarMessage) {
          const avatarText = normalizeText(lastAvatarMessage.text);
          const combinedSimilarity = calculateCombinedSimilarity(userText, avatarText);
          const similarityThreshold = 85;

          if (combinedSimilarity >= similarityThreshold || userText.includes(avatarText) || avatarText.includes(userText)) {
            console.log("[STT] Ignored similar message:", {
              userText,
              avatarText,
              combinedSimilarity,
              threshold: similarityThreshold,
            });
            return;
          }
        }

        if (userText.length < 1) {
          console.log("[STT] Ignored short transcript:", userText);
          return;
        }

        console.log("[STT] Final transcript:", finalTranscript);
        onTranscript(finalTranscript);
      }
    };

    // مدیریت شروع STT بر اساس isSpeaking
    if (isSpeaking && !isActiveRef.current && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log("[STT] Started after VAD trigger");
      } catch (e: unknown) {
        const error = e as Error;
        if (error.name === "InvalidStateError" || error.message?.includes("recognition has already started")) {
          // Ignore
        } else {
          console.warn("[STT] Start error:", e);
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      isActiveRef.current = false;
    };
  }, [enabled, isProcessing, isAvatarTalking, messages, onTranscript, isSpeaking, language]);

  // تابع برای reset کردن permission denial
  const resetPermissionDenial = () => {
    permissionDeniedRef.current = false;
    console.log("[STT] Permission denial reset");
  };

  // تابع برای بررسی وضعیت STT
  const getSTTStatus = () => {
    return {
      isActive: isActiveRef.current,
      isPermissionDenied: permissionDeniedRef.current,
      isHTTPS: checkHTTPS(),
      isSupported: checkSpeechRecognitionSupport(),
      networkErrorCount: networkErrorCountRef.current
    };
  };

  return {
    isActive: isActiveRef.current,
    resetPermissionDenial,
    getSTTStatus,
    requestMicrophonePermission
  };
}