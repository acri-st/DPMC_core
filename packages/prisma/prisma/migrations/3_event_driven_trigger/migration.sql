-- Trigger function: for every new product, insert a task for each matching enabled hook.
-- task.id is a serial autoincrement column, so it is omitted from the INSERT and supplied
-- by the sequence default. executionTag remains a unique text column.
CREATE OR REPLACE FUNCTION fn_product_ingestion_hook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "task" (
    "projectId",
    "kind",
    "productionChainId",
    "productId",
    "executionTag",
    "status",
    "scheduledStartTime",
    "priority",
    "productionMode",
    "priorityClass",
    "createdAt",
    "updatedAt"
  )
  SELECT
    h."projectId",
    'chain',
    h."productionChainId",
    NEW."id",
    gen_random_uuid()::text,
    'queued',
    now(),
    0,
    h."productionMode",
    'on_demand',
    now(),
    now()
  FROM "product_x_ingestion_hook" h
  WHERE h."productTypeId" = NEW."productTypeId"
    AND h."enabled" = true
    AND h."productionChainId" IS NOT NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_ingestion_hook
  AFTER INSERT ON "product"
  FOR EACH ROW EXECUTE FUNCTION fn_product_ingestion_hook();
