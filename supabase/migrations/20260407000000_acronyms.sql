-- Acronyms table: user-scoped persistent glossary
CREATE TABLE acronyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acronym TEXT NOT NULL,
  definition TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, acronym)
);

CREATE INDEX idx_acronyms_user_id ON acronyms(user_id);

ALTER TABLE acronyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own acronyms"
  ON acronyms FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
