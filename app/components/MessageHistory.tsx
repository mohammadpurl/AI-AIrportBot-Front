import { useMessageHistory } from "@/hooks/useMessageHistory";
import { MessageSender } from "@/types/type";
import React, { useEffect, useMemo, useRef } from "react";

export const MessageHistory: React.FC = () => {
  const { messages } = useMessageHistory();
  const containerRef = useRef<HTMLDivElement>(null);

  const bubbleText = useMemo(() => {
    if (!messages?.length) return "";
    // Prefer the last AVATAR message; fallback to last message
    const lastAvatar = [...messages].reverse().find(m => m.sender === MessageSender.AVATAR);
    return ( messages[messages.length - 1]?.text ?? "").trim();
  }, [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [bubbleText]);

  if (!bubbleText) return null;

  return (
    <div className="pointer-events-none fixed top-2 left-1/2 -translate-x-1/2 z-10 max-w-[70vw]">
      <div
        ref={containerRef}
        className="relative inline-block bg-white/95 text-black border border-white/80 shadow-2xl rounded-2xl px-4 py-3 max-w-[680px] backdrop-blur-sm"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <p className="text-[13px] leading-5 whitespace-pre-wrap break-words font-medium">
          {bubbleText}
        </p>
        {/* Tail */}
        <div className="absolute -bottom-2 left-10 w-0 h-0 border-t-8 border-t-white/95 border-x-8 border-x-transparent" />
      </div>
    </div>
  );
};
