-- EOCP-E9-03 — Task Table conversions must be traceable.
--
-- The import plan already recorded the parsed IR, but not the document it came
-- from nor the records the commit produced, so a conversion could not be
-- audited or replayed from its history entry. Both ends of the conversion are
-- now stored on the plan.
--
-- Nullable throughout: plans imported before this migration keep their IR and
-- simply have no source document or committed ids to show.

ALTER TABLE "task_table_import_plan"
  ADD COLUMN "sourceName"         TEXT,
  ADD COLUMN "sourceContent"      TEXT,
  ADD COLUMN "committedScriptId"  INTEGER,
  ADD COLUMN "committedVersionId" INTEGER;
