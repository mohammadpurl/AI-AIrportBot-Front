import { useChatContext } from "./useChat";


export const useMessageHistory = () => {
  const { messages } = useChatContext();
  console.log("messages", messages);
  return { messages };
};
