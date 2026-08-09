CREATE OR REPLACE FUNCTION bigram_tokens(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  word text;
  tokens text[] := '{}';
  wlen int;
BEGIN
  IF input IS NULL OR trim(input) = '' THEN
    RETURN '';
  END IF;

  FOREACH word IN ARRAY regexp_split_to_array(trim(input), '\s+') LOOP
    IF word = '' THEN
      CONTINUE;
    END IF;

    wlen := char_length(word);
    IF wlen <= 2 THEN
      tokens := array_append(tokens, word);
    ELSE
      FOR i IN 1..(wlen - 1) LOOP
        tokens := array_append(tokens, substr(word, i, 2));
      END LOOP;
    END IF;
  END LOOP;

  RETURN array_to_string(tokens, ' ');
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION bigram_tsquery(input text)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_tsquery('simple', array_to_string(string_to_array(bigram_tokens(input), ' '), ' | '));
$$;
--> statement-breakpoint
ALTER TABLE posts ADD COLUMN title_search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', bigram_tokens(title))) STORED;
--> statement-breakpoint
ALTER TABLE sources ADD COLUMN content_search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', bigram_tokens(content))) STORED;
--> statement-breakpoint
CREATE INDEX posts_title_search_vector_idx ON posts USING GIN (title_search_vector);
--> statement-breakpoint
CREATE INDEX sources_content_search_vector_idx ON sources USING GIN (content_search_vector);
--> statement-breakpoint
DROP INDEX IF EXISTS posts_title_trgm_idx;
--> statement-breakpoint
DROP EXTENSION IF EXISTS pg_trgm;
