-- Cached Gemini/Google Doc notes attached to meetings
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_file_id TEXT,
  source_title TEXT,
  content TEXT NOT NULL DEFAULT '',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(meeting_id)
);

CREATE INDEX idx_meeting_notes_meeting ON meeting_notes(meeting_id);
CREATE INDEX idx_meeting_notes_source_file ON meeting_notes(source_file_id);
CREATE INDEX idx_meeting_notes_search ON meeting_notes USING gin(to_tsvector('english', content));

ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD notes for meetings in their weeks"
  ON meeting_notes FOR ALL
  USING (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN weeks w ON w.id = m.week_id
      WHERE w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    meeting_id IN (
      SELECT m.id
      FROM meetings m
      JOIN weeks w ON w.id = m.week_id
      WHERE w.user_id = auth.uid()
    )
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Reload PostgREST schema cache so new table is immediately queryable
NOTIFY pgrst, 'reload schema';
