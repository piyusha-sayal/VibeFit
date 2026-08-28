import { get, post } from './api';
import { ApiResponse, OnboardingAnswers, OnboardingRecord, VibeProfile, ProfileCorrection } from '../types';

export async function saveOnboarding(answers: Partial<OnboardingAnswers>): Promise<ApiResponse<OnboardingRecord>> {
  return post<OnboardingRecord>('/profile/onboarding', answers);
}

export async function getOnboarding(): Promise<ApiResponse<OnboardingRecord>> {
  return get<OnboardingRecord>('/profile/onboarding');
}

export async function getVibeProfile(): Promise<ApiResponse<VibeProfile>> {
  return get<VibeProfile>('/profile/vibe');
}

export async function saveCorrection(
  attributeKey: string,
  correctedValue: unknown,
  note?: string,
): Promise<ApiResponse<ProfileCorrection>> {
  return post<ProfileCorrection>('/profile/corrections', { attributeKey, correctedValue, note });
}

export async function listCorrections(): Promise<ApiResponse<ProfileCorrection[]>> {
  return get<ProfileCorrection[]>('/profile/corrections');
}
