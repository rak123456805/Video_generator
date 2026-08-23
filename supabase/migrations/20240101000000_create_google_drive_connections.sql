-- Migration: Create google_drive_connections table
-- One Google Drive connection per Supabase user (1:1)

CREATE TABLE IF NOT EXISTS public.google_drive_connections (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email           TEXT NOT NULL,
  drive_folder_id        TEXT,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_google_drive_connections_user_id
  ON public.google_drive_connections(user_id);

-- Enable Row Level Security
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own connection record
CREATE POLICY "Users can view own drive connection"
  ON public.google_drive_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own connection record
CREATE POLICY "Users can update own drive connection"
  ON public.google_drive_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own connection record
CREATE POLICY "Users can delete own drive connection"
  ON public.google_drive_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- NOTE: INSERT is handled exclusively by the Node.js backend using the
-- service-role key (bypasses RLS). The frontend never directly inserts rows.
-- This ensures the encrypted_refresh_token is never exposed to the client.

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_google_drive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_google_drive_updated_at
  BEFORE UPDATE ON public.google_drive_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_google_drive_updated_at();

COMMENT ON TABLE public.google_drive_connections IS
  'Stores per-user Google Drive OAuth connections. The encrypted_refresh_token is server-side only and never exposed to the frontend.';
