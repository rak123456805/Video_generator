/**
 * frontend/src/api/quizApi.ts
 *
 * Client-side API helpers for Quiz persistent storage and statistics.
 */

import apiClient from "./client";

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

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
  questionCount: number;
  questions?: QuizQuestion[];
  user_id?: string;
}

/**
 * Save a completed quiz result to Supabase.
 */
export async function saveQuizResult(quizId: string, score: number, totalQuestions: number, topic?: string): Promise<QuizResult> {
  const res = await apiClient.post("/quiz/result", {
    quizId,
    score,
    totalQuestions,
    topic,
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

/**
 * Fetch a single quiz by its ID.
 */
export async function getQuizById(id: string): Promise<QuizHeader & { questions: QuizQuestion[] }> {
  const res = await apiClient.get(`/quiz/${id}`);
  return res.data.quiz;
}

/**
 * Generate a new quiz or the next follow-up quiz containing 10 questions.
 */
export async function generateQuizApi(params: {
  topic: string;
  scriptSlides?: any[];
  language?: string;
  questionCount?: number;
  previousQuestions?: any[];
  isNextQuiz?: boolean;
  quizNumber?: number;
}): Promise<{ success: boolean; quizId: string; topic: string; questions: QuizQuestion[]; questionCount: number }> {
  const res = await apiClient.post("/quiz/generate", {
    questionCount: 10,
    language: "en",
    ...params,
  });
  return res.data;
}

/**
 * Delete a quiz by its ID.
 */
export async function deleteQuiz(id: string): Promise<boolean> {
  const res = await apiClient.delete(`/quiz/${id}`);
  return res.data.success;
}

