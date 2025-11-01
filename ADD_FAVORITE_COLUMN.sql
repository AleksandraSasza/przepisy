-- Dodaj kolumnę favorite do tabeli dishes
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false NOT NULL;

-- Opcjonalnie: dodaj index dla szybszych zapytań
CREATE INDEX IF NOT EXISTS idx_dishes_favorite ON dishes(user_id, favorite) WHERE favorite = true;

