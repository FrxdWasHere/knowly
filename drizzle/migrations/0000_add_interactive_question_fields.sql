ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS pairs jsonb,
  ADD COLUMN IF NOT EXISTS blanks jsonb,
  ADD COLUMN IF NOT EXISTS word_bank jsonb;