> **Deprecated.** This CLI is superseded by the Python `dpmc` (see `apps/cli/`).
> The bash CLI will be removed in a follow-up PR once parity is verified in practice.

# `dpmc-db`

Direct-SQL helper CLI for dev/test workflows. Bypasses the API.

> **Scope:** dev/test only. This tool talks straight to Postgres — it skips
> auth, RBAC, and `productIngestionHooks`. Don't use it on a production DB.

## Setup

Requires `psql` on the host and the Postgres service running (typically via
`docker compose up postgres`).

`DATABASE_URL` is resolved in this order:

1. `$DATABASE_URL` already exported in your shell.
2. Otherwise, `<repo>/packages/prisma/.env` is sourced.
3. Otherwise, the CLI exits with code `2`.

`--help` works without any DB connection.

## Commands

```bash
# Create a product
bin/dpmc-db product create --name <name> --type <acronym> \
  [--version <v>] [--generated-at <iso8601>] \
  [--size <bytes>] [--default] [--comment <text>]

# Delete (DB only — disk files are not touched)
bin/dpmc-db product delete <name> [--version <v>]

# List with optional filters
bin/dpmc-db product list [--name-like <pattern>] [--type <acronym>] [--with-size]

# Get full record (by name or UUID)
bin/dpmc-db product get <name-or-id> [--version <v>]
```

Add `--json` (global flag, before the resource) to switch all output —
including errors — to JSON:

```bash
bin/dpmc-db --json product list --type L1B
bin/dpmc-db --json product get SOME_NAME
```

## Multi-version disambiguation

Because `Product` has `@@unique([name, version])`, multiple rows can share the
same `name` if they have different versions. When `delete` or `get` resolve a
name and find more than one match, they refuse and list the available versions:

```
$ bin/dpmc-db product delete SMOKE_001
dpmc-db: error: Multiple products named 'SMOKE_001' found, use --version: 1.0,2.0
```

Pass `--version <v>` to target one. Use `--version ""` to target the row whose
version is `NULL`.

## Exit codes

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| `0`  | Success                                             |
| `1`  | User error (bad args, not found, ambiguous version) |
| `2`  | DB connection error                                 |
| `3`  | Unexpected SQL error                                |

## Smoke test

Run this end-to-end once after any change to the CLI or after touching the
schema migrations. Assumes a clean local DB.

```bash
# 0. Start dependencies
docker compose up -d postgres
pnpm --filter @dpmc/prisma migrate deploy   # if your DB is empty

# 1. Create a ProductType to point at (the CLI doesn't manage these yet)
psql "$DATABASE_URL" <<'SQL'
INSERT INTO product_type (id, acronym, name, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'TEST_L1B', 'Test L1B Product Type', now(), now());
SQL

# 2. Create — minimal
bin/dpmc-db product create --name SMOKE_001 --type TEST_L1B --version 1.0

# 3. Create — all flags
bin/dpmc-db product create \
  --name SMOKE_002 --type TEST_L1B --version 1.0 \
  --generated-at "2026-01-01T00:00:00Z" \
  --size 1048576 --default --comment "test product"

# 4. List variants
bin/dpmc-db product list
bin/dpmc-db product list --type TEST_L1B
bin/dpmc-db product list --with-size
bin/dpmc-db product list --name-like SMOKE

# 5. Get — human and JSON
bin/dpmc-db product get SMOKE_001
bin/dpmc-db --json product get SMOKE_001

# 6. Multi-version ambiguity
bin/dpmc-db product create --name SMOKE_001 --type TEST_L1B --version 2.0
bin/dpmc-db product delete SMOKE_001                # expect: error (ambiguous)
bin/dpmc-db product delete SMOKE_001 --version 2.0  # expect: ok

# 7. Error paths
bin/dpmc-db product create --name X --type DOES_NOT_EXIST   # expect: exit 1
bin/dpmc-db --json product create --name X --type DOES_NOT_EXIST

# 8. Cleanup
bin/dpmc-db product delete SMOKE_001
bin/dpmc-db product delete SMOKE_002
psql "$DATABASE_URL" -c "DELETE FROM product_type WHERE acronym = 'TEST_L1B'"
```

## Adding new commands / resources

The CLI is split by resource (one file per resource under `bin/dpmc-db.d/`):

```
bin/
├── dpmc-db                   # entrypoint, parses global flags + dispatches
└── dpmc-db.d/
    ├── README.md             # this file
    ├── common.sh             # shared helpers (die, psql_exec, ...)
    └── product.sh            # cmd_product_*
```

To add a new resource (e.g. `dataset`):

1. Create `bin/dpmc-db.d/dataset.sh` defining `dataset_dispatch` plus
   `cmd_dataset_<verb>` functions, mirroring `product.sh`.
2. Add `source "$SCRIPT_DIR/dpmc-db.d/dataset.sh"` near the top of `bin/dpmc-db`.
3. Add a `dataset) dataset_dispatch "$@" ;;` arm to the `case "$RESOURCE"` switch.
4. Update this README's command list and smoke test.

## Implementation notes

Worth knowing if you touch the SQL:

- **Use stdin, not `-c`.** `psql -c "..."` disables `:variable` interpolation
  entirely. All queries in this CLI are sent via `<<<` so that `-v name=value`
  and `:'name'` keep working. If you add a new query and skip this, the parser
  will trip on the literal `:`.
- **Quote camelCase columns.** Prisma generated DB columns in literal camelCase
  without `@map()` (`"productTypeId"`, `"generatedAt"`, `"isDefault"`,
  `"parentBatchId"`, `"createdAt"` on `product`; `"createdAt"`, `"updatedAt"`,
  `"processingLevel"` on `product_type`). Unquoted, Postgres folds them to
  lowercase and the query fails.
