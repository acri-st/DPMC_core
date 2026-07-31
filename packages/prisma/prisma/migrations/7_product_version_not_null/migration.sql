-- Fail early with an actionable message: once version is NOT NULL, rows that
-- were (name, NULL) collapse onto (name, '') and would trip the existing
-- product_name_version_key unique index with an opaque constraint error.
DO $$
DECLARE
  conflicts TEXT;
BEGIN
  SELECT string_agg(DISTINCT p."name", ', ')
    INTO conflicts
    FROM "product" p
    JOIN "product" q
      ON q."name" = p."name"
     AND q."id" <> p."id"
     AND COALESCE(q."version", '') = ''
   WHERE p."version" IS NULL;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set product.version NOT NULL: duplicate (name, empty version) products for: %', conflicts;
  END IF;
END $$;

UPDATE "product" SET "version" = '' WHERE "version" IS NULL;

ALTER TABLE "product"
  ALTER COLUMN "version" SET DEFAULT '',
  ALTER COLUMN "version" SET NOT NULL;
