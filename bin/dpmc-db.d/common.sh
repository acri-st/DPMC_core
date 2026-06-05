# common.sh — sourced by dpmc-db
# Provides: die, load_database_url, psql_exec, pre_check_db, is_uuid
# Expects: $SCRIPT_DIR set by dpmc-db, reads ${JSON_OUTPUT:-0} dynamically.

REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

die() {
    local code=$1
    shift
    local msg="$*"
    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        if command -v jq >/dev/null 2>&1; then
            printf '{"error":%s}\n' "$(printf '%s' "$msg" | jq -Rs .)" >&2
        else
            local esc=${msg//\\/\\\\}
            esc=${esc//\"/\\\"}
            printf '{"error":"%s"}\n' "$esc" >&2
        fi
    else
        printf 'dpmc-db: error: %s\n' "$msg" >&2
    fi
    exit "$code"
}

load_database_url() {
    if [[ -n "${DATABASE_URL:-}" ]]; then
        return 0
    fi
    local env_file="$REPO_ROOT/packages/prisma/.env"
    if [[ -f "$env_file" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "$env_file"
        set +a
    fi
    if [[ -z "${DATABASE_URL:-}" ]]; then
        die 2 "DATABASE_URL not set, source packages/prisma/.env or export it"
    fi
}

psql_exec() {
    psql "$DATABASE_URL" \
        --quiet --no-psqlrc \
        -v ON_ERROR_STOP=1 \
        "$@"
}

pre_check_db() {
    if ! psql_exec >/dev/null 2>&1 <<< 'SELECT 1'; then
        die 2 "cannot connect to database"
    fi
}

is_uuid() {
    [[ "$1" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]
}
