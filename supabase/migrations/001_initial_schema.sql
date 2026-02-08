-- Weeks
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Meetings
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action Items
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 2),
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_id, day_of_week)
);

-- Indexes
CREATE INDEX idx_weeks_user_start ON weeks(user_id, week_start);
CREATE INDEX idx_meetings_week_day ON meetings(week_id, day_of_week);
CREATE INDEX idx_action_items_week_day ON action_items(week_id, day_of_week);
CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_notes_week_day ON notes(week_id, day_of_week);

-- Full-text search indexes
CREATE INDEX idx_meetings_search ON meetings USING gin(to_tsvector('english', title));
CREATE INDEX idx_action_items_search ON action_items USING gin(to_tsvector('english', content));
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', content));

-- Row Level Security
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own weeks"
  ON weeks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD meetings in their weeks"
  ON meetings FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD action items in their weeks"
  ON action_items FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD notes in their weeks"
  ON notes FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
