-- Tasks table (persistent kanban board)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
  priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  meeting_title TEXT,
  meeting_week_start DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_user_status_order ON tasks(user_id, status, sort_order);
CREATE INDEX idx_tasks_meeting ON tasks(meeting_id);
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', content));

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migrate existing action_items → tasks
INSERT INTO tasks (user_id, content, status, priority, sort_order, meeting_id, meeting_title, meeting_week_start, completed_at, created_at, updated_at)
SELECT
  w.user_id,
  ai.content,
  CASE WHEN ai.is_done THEN 'done' ELSE 'todo' END,
  ai.priority,
  ai.sort_order,
  ai.meeting_id,
  m.title,
  w.week_start,
  CASE WHEN ai.is_done THEN ai.updated_at ELSE NULL END,
  ai.created_at,
  ai.updated_at
FROM action_items ai
JOIN weeks w ON w.id = ai.week_id
LEFT JOIN meetings m ON m.id = ai.meeting_id;

-- Update search function to include tasks
CREATE OR REPLACE FUNCTION search_all(search_query TEXT, user_id_param UUID)
RETURNS TABLE (
  item_type TEXT,
  item_id UUID,
  week_id UUID,
  week_start DATE,
  day_of_week SMALLINT,
  content TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'meeting'::TEXT as item_type,
    m.id as item_id,
    w.id as week_id,
    w.week_start,
    m.day_of_week,
    m.title as content,
    ts_rank(to_tsvector('english', m.title), websearch_to_tsquery('english', search_query)) as rank
  FROM meetings m
  JOIN weeks w ON w.id = m.week_id
  WHERE w.user_id = user_id_param
    AND to_tsvector('english', m.title) @@ websearch_to_tsquery('english', search_query)

  UNION ALL

  SELECT
    'task'::TEXT,
    t.id,
    NULL::UUID,
    t.meeting_week_start,
    NULL::SMALLINT,
    t.content,
    ts_rank(to_tsvector('english', t.content), websearch_to_tsquery('english', search_query))
  FROM tasks t
  WHERE t.user_id = user_id_param
    AND to_tsvector('english', t.content) @@ websearch_to_tsquery('english', search_query)

  UNION ALL

  SELECT
    'note'::TEXT,
    n.id,
    w.id,
    w.week_start,
    n.day_of_week,
    n.content,
    ts_rank(to_tsvector('english', n.content), websearch_to_tsquery('english', search_query))
  FROM notes n
  JOIN weeks w ON w.id = n.week_id
  WHERE w.user_id = user_id_param
    AND to_tsvector('english', n.content) @@ websearch_to_tsquery('english', search_query)

  ORDER BY rank DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
