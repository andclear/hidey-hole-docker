-- Create card_reviews table for 1:1 personal reviews
CREATE TABLE IF NOT EXISTS card_reviews (
  card_id UUID PRIMARY KEY REFERENCES character_cards(id) ON DELETE CASCADE,
  rating_plot SMALLINT CHECK (rating_plot BETWEEN 0 AND 5),
  rating_logic SMALLINT CHECK (rating_logic BETWEEN 0 AND 5),
  rating_worldview SMALLINT CHECK (rating_worldview BETWEEN 0 AND 5),
  rating_formatting SMALLINT CHECK (rating_formatting BETWEEN 0 AND 5),
  rating_playability SMALLINT CHECK (rating_playability BETWEEN 0 AND 5),
  rating_human SMALLINT CHECK (rating_human BETWEEN 0 AND 5),
  rating_first_message SMALLINT CHECK (rating_first_message BETWEEN 0 AND 5),
  mood TEXT,
  best_model TEXT,
  best_preset TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE card_reviews IS 'Stores personal reviews for character cards (1:1 relationship)';

-- Since we are moving to a 1:1 review system, we might want to migrate data or just start fresh.
-- For this task, we create the new structure. The old play_sessions table can remain for now or be dropped manually.
