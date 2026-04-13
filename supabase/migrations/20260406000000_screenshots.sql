-- Screenshots table for week-scoped image gallery
CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_screenshots_week ON screenshots(week_id);
CREATE INDEX idx_screenshots_user_week ON screenshots(user_id, week_id);

ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own screenshots"
  ON screenshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots"
  ON screenshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own screenshots"
  ON screenshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenshots"
  ON screenshots FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own images from storage
CREATE POLICY "Users can delete own task images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Reload PostgREST schema cache so new table is immediately queryable
NOTIFY pgrst, 'reload schema';
