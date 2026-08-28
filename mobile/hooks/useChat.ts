import { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';

export function useChat(analysisId?: string) {
  const store = useChatStore();

  useEffect(() => {
    if (!store.currentSession) {
      store.startSession(analysisId);
    }
  }, [analysisId]);

  const [inputValue, setInputValue] = useState('');

  const send = async (content: string) => {
    if (!content.trim()) return;
    await store.sendMessage(content.trim(), analysisId);
  };

  return {
    messages: store.messages,
    isSending: store.isSending,
    isLoading: store.isLoading,
    error: store.error,
    inputValue,
    setInputValue,
    send,
    clearError: store.clearError,
    reset: store.reset,
  };
}
