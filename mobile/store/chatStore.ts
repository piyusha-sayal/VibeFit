import { create } from 'zustand';
import { ChatMessage, ChatSession } from '../types';
import * as chatService from '../services/chatService';

interface ChatState {
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  sessions: ChatSession[];
  isSending: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string, analysisId?: string) => Promise<void>;
  startSession: (analysisId?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  addOptimisticMessage: (content: string) => void;
  clearError: () => void;
  reset: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentSession: null,
  messages: [],
  sessions: [],
  isSending: false,
  isLoading: false,
  error: null,

  sendMessage: async (content, analysisId) => {
    const { currentSession } = get();
    get().addOptimisticMessage(content);
    set({ isSending: true, error: null });
    try {
      // Backend returns the whole updated session (user + assistant messages).
      const response = await chatService.sendMessage({
        content,
        sessionId: currentSession?.id,
        analysisId,
      });
      if (!response.success || !response.data) throw new Error(response.error ?? 'Failed to send');
      set({
        currentSession: response.data,
        messages: response.data.messages,
      });
    } catch (err) {
      set((s) => ({ messages: s.messages.filter((m) => m.id !== 'optimistic'), error: err instanceof Error ? err.message : 'Failed to send' }));
      throw err;
    } finally {
      set({ isSending: false });
    }
  },

  // No server-side create endpoint: the session is created on the first
  // message. Just reset local state; analysisId is applied on send.
  startSession: async (_analysisId) => {
    set({ currentSession: null, messages: [], isLoading: false });
  },

  loadSession: async (sessionId) => {
    set({ isLoading: true });
    try {
      const response = await chatService.getSession(sessionId);
      if (!response.success || !response.data) throw new Error('Session not found');
      set({ currentSession: response.data, messages: response.data.messages });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load session' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSessions: async () => {
    try {
      const response = await chatService.listSessions();
      if (response.success && response.data) set({ sessions: response.data });
    } catch {
      // silently ignore
    }
  },

  addOptimisticMessage: (content) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id: 'optimistic', role: 'user' as const, content, createdAt: nowIso() },
      ],
    })),

  clearError: () => set({ error: null }),
  reset: () => set({ currentSession: null, messages: [], isSending: false, isLoading: false, error: null }),
}));
