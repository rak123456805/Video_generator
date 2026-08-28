/**
 * frontend/src/api/quizApi.ts
 *
 * Client-side API helpers for Quiz persistent storage and statistics.
 */

import apiClient from "./client";

export interface QuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  grade: string;
  created_at: string;
  quizzes?: {
    topic: string;
  };
}

export interface QuizStats {
  totalTaken: number;
  avgPercentage: number;
  avgGrade: string;
}

export interface QuizHeader {
  id: string;
  topic: string;
  created_at: string;
}

/**
 * Save a completed quiz result to Supabase.
 */
export async function saveQuizResult(quizId: string, score: number, totalQuestions: number): Promise<QuizResult> {
  const res = await apiClient.post("/quiz/result", {
    quizId,
    score,
    totalQuestions,
  });
  return res.data.result;
}

/**
 * Fetch all quiz attempt results for the authenticated user.
 */
export async function getQuizResults(): Promise<QuizResult[]> {
  const res = await apiClient.get("/quiz/results");
  return res.data.results || [];
}

/**
 * Fetch aggregated quiz statistics for the authenticated user.
 */
export async function getQuizStats(): Promise<QuizStats> {
  const res = await apiClient.get("/quiz/stats");
  return res.data.stats;
}

/**
 * List all generated quizzes available to take.
 */
export async function listQuizzes(): Promise<QuizHeader[]> {
  const res = await apiClient.get("/quiz/list");
  return res.data.quizzes || [];
}
