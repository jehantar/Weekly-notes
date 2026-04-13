CREATE TABLE question_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start DATE NOT NULL,
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, question_hash)
);

ALTER TABLE question_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resolutions"
  ON question_resolutions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resolutions"
  ON question_resolutions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resolutions"
  ON question_resolutions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resolutions"
  ON question_resolutions FOR DELETE
  USING (auth.uid() = user_id);

-- Reload PostgREST schema cache so new table is immediately queryable
NOTIFY pgrst, 'reload schema';
