import { get, post, del } from './api';
import { ChatSession, ApiResponse } from '../types';

interface SendMessagePayload {
  content: string;
  sessionId?: string;
  analysisId?: string;
}

// Backend creates the session implicitly on first message and returns the full
// updated session (with all messages) — there is no separate create endpoint.
export async function sendMessage(payload: SendMessagePayload): Promise<ApiResponse<ChatSession>> {
  return post<ChatSession>('/chat/message', payload);
}

export async function getSession(sessionId: string): Promise<ApiResponse<ChatSession>> {
  return get<ChatSession>(`/chat/sessions/${sessionId}`);
}

export async function listSessions(page = 1, limit = 20): Promise<ApiResponse<ChatSession[]>> {
  return get<ChatSession[]>(`/chat/sessions?page=${page}&limit=${limit}`);
}

export async function deleteSession(sessionId: string): Promise<ApiResponse<null>> {
  return del<null>(`/chat/sessions/${sessionId}`);
}
