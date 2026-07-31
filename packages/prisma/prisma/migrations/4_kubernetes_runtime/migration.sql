-- Add the host-only "kubernetes" execution capability to the container_runtime
-- enum. A Kubernetes host runs OCI images, so it serves "docker" script
-- artifacts; the dispatcher treats it as satisfying a Docker requirement.
--
-- ALTER TYPE ... ADD VALUE is non-transactional on PostgreSQL < 12; on 12+ it
-- is allowed inside a transaction as long as the new value is not used in the
-- same transaction (it is not here), so this is safe under Prisma's per-file tx.
ALTER TYPE "container_runtime" ADD VALUE IF NOT EXISTS 'kubernetes';
