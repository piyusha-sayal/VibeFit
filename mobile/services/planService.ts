import { get, post } from './api';
import { ActionFeedbackType, ActionPlan, ApiResponse } from '../types';

export async function getActionPlan(): Promise<ApiResponse<ActionPlan>> {
  return get<ActionPlan>('/plan');
}

export async function submitActionFeedback(
  actionId: string,
  feedbackType: ActionFeedbackType,
  note?: string,
): Promise<ApiResponse<{ id: string }>> {
  return post<{ id: string }>(`/plan/${actionId}/feedback`, { feedbackType, note });
}
