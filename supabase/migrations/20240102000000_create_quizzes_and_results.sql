-- Migration: Create quizzes and quiz_results tables
-- Enables persistent storage for generated quizzes and user attempt results

-- 1. Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id           TEXT PRIMARY KEY, -- maps to jobId
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  topic        TEXT NOT NULL,
  questions    JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup on quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON public.quizzes(user_id);

-- 2. Create quiz_results table
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id         TEXT REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage      NUMERIC NOT NULL,
  grade           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup on results
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Quizzes
CREATE POLICY "Anyone can view quizzes" 
  ON public.quizzes
  FOR SELECT 
  USING (true);

-- Allow authenticated users to save/insert quizzes
CREATE POLICY "Authenticated users can insert quizzes" 
  ON public.quizzes
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- RLS Policies: Quiz Results
CREATE POLICY "Users can view own quiz results" 
  ON public.quiz_results
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" 
  ON public.quiz_results
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
