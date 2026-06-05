# @dpmc/cli — `dpmc`

Python CLI for the DPMC platform. Talks to the NestJS API via OData; authenticates with Keycloak via the OAuth 2.0 Device Authorization Grant.

## Quickstart

```bash
# From the repo root
pnpm install
uv sync --project apps/cli

# Authenticate
./bin/dpmc login

# Use
./bin/dpmc product list
./bin/dpmc product create --name FOO --type L1B
```

## Configuration

Env vars (all optional, with sensible localhost defaults):

| Var                   | Default                      | Purpose                  |
|-----------------------|------------------------------|--------------------------|
| `DPMC_API_URL`        | `http://localhost:3000/api`  | API base URL             |
| `DPMC_KEYCLOAK_URL`   | `http://localhost:8080`      | Keycloak base URL        |
| `DPMC_KEYCLOAK_REALM` | `dpmc`                       | Keycloak realm           |
| `DPMC_CLIENT_ID`      | `dpmc-api`                   | OAuth client id          |
| `DPMC_CONFIG_DIR`     | `$XDG_CONFIG_HOME/dpmc`      | Credentials directory    |
