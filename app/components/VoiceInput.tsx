import { useAutoSTT } from "@/hooks/useAutoSTT";
import { useChatContext } from "@/hooks/useChat";
import { Language } from "@/hooks/useChat";
import { STTStatus } from "./STTStatus";


// Helper function to normalize text
function normalizeText(text: string): string {
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}

interface VoiceInputProps {
  language: Language;
}

export const VoiceInput = ({ language }: VoiceInputProps) => {
    const { chat, isProcessing, isAvatarTalking, isSessionActive } = useChatContext();
  
    // console.log("VoiceInput: isProcessing:", isProcessing, "isAvatarTalking:", isAvatarTalking, "isSessionActive:", isSessionActive);
  
    const { 
      resetPermissionDenial, 
      getSTTStatus, 
      requestMicrophonePermission 
    } = useAutoSTT(
      isSessionActive && !isProcessing && !isAvatarTalking, // فقط وقتی session فعال است و نه در حال پردازش هستیم و نه آواتار صحبت می‌کند
      (text) => {
        if (!isSessionActive || isProcessing || isAvatarTalking) {
          // console.log("VoiceInput: Ignored transcript - session not active, processing, or avatar talking");
          return;
        }
        const normalizedText = normalizeText(text);
        if (normalizedText.length < 2) {
          console.log("[STT] Ignored short message:", normalizedText);
          return;
        }
  
        // console.log("VoiceInput: Processing user input:", text);
        chat(text);
      },
      isProcessing,
      language
    );

    const sttStatus = getSTTStatus();
  
    return (
      <STTStatus
        isPermissionDenied={sttStatus.isPermissionDenied}
        isHTTPS={sttStatus.isHTTPS}
        isSupported={sttStatus.isSupported}
        networkErrorCount={sttStatus.networkErrorCount}
        onRequestPermission={requestMicrophonePermission}
        onResetPermission={resetPermissionDenial}
      />
    );
  };