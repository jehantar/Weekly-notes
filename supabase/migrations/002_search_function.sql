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
    'action_item'::TEXT,
    ai.id,
    w.id,
    w.week_start,
    ai.day_of_week,
    ai.content,
    ts_rank(to_tsvector('english', ai.content), websearch_to_tsquery('english', search_query))
  FROM action_items ai
  JOIN weeks w ON w.id = ai.week_id
  WHERE w.user_id = user_id_param
    AND to_tsvector('english', ai.content) @@ websearch_to_tsquery('english', search_query)

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
