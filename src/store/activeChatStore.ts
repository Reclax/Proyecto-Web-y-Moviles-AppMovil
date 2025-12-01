import { create } from "zustand";

interface ActiveChatState {
  activeConversationId: number | null;
  setActiveConversation: (conversationId: number | null) => void;
  isInConversation: (conversationId: number) => boolean;
}

export const useActiveChatStore = create<ActiveChatState>((set, get) => ({
  activeConversationId: null,
  
  setActiveConversation: (conversationId: number | null) => {
    console.log('[ActiveChat] Setting active conversation:', conversationId);
    set({ activeConversationId: conversationId });
  },
  
  isInConversation: (conversationId: number) => {
    return get().activeConversationId === conversationId;
  },
}));

export default useActiveChatStore;
