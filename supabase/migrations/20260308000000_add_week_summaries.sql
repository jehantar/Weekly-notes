CREATE TABLE week_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- RLS: users can only access their own summaries
ALTER TABLE week_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON week_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON week_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON week_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON week_summaries FOR DELETE
  USING (auth.uid() = user_id);
