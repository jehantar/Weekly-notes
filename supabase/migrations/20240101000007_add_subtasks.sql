-- Subtasks table: checklist items within tasks
CREATE TABLE subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookup by task
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id, sort_order);

-- RLS: users can only access subtasks for their own tasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subtasks"
  ON subtasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()::text
    )
  );
