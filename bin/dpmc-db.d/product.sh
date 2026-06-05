# product.sh — sourced by dpmc-db
# Subcommands for managing Product rows.
#
# NOTE on column naming: Prisma generated DB columns in camelCase without
# @map() (e.g. "productTypeId", "generatedAt"). Postgres requires those
# identifiers to be double-quoted in SQL. Bash variables stay snake_case.

product_usage() {
    cat <<EOF
Manage products in the DPMC database.

Usage:
  dpmc-db product create  --name <n> --type <acronym> [options]
  dpmc-db product delete  <name> [--version <v>]
  dpmc-db product list    [--name-like <p>] [--type <a>] [--with-size]
  dpmc-db product get     <name-or-id> [--version <v>]
  dpmc-db product --help

Run 'dpmc-db product <command> --help' for command-specific help.
EOF
}

product_dispatch() {
    if [[ $# -eq 0 ]]; then
        product_usage
        return 0
    fi
    local cmd="$1"
    shift
    case "$cmd" in
        --help | -h) product_usage ;;
        create) cmd_product_create "$@" ;;
        delete) cmd_product_delete "$@" ;;
        list) cmd_product_list "$@" ;;
        get) cmd_product_get "$@" ;;
        *) die 1 "unknown product command: $cmd" ;;
    esac
}

# ---------- create ----------

_product_create_usage() {
    cat <<EOF
Create a Product in the database.

Usage:
  dpmc-db product create --name <name> --type <acronym> [options]

Required:
  --name <name>           Product name
  --type <acronym>        ProductType acronym (must exist)

Options:
  --version <v>           Product version
  --generated-at <iso>    ISO 8601 timestamp
  --size <bytes>          Size in bytes
  --default               Mark as default
  --comment <text>        Free-form comment
EOF
}

cmd_product_create() {
    local name="" type_acronym="" version="" generated_at="" size="" comment=""
    local is_default=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --name)
                name="${2:-}"
                shift 2
                ;;
            --type)
                type_acronym="${2:-}"
                shift 2
                ;;
            --version)
                version="${2:-}"
                shift 2
                ;;
            --generated-at)
                generated_at="${2:-}"
                shift 2
                ;;
            --size)
                size="${2:-}"
                shift 2
                ;;
            --default)
                is_default=true
                shift
                ;;
            --comment)
                comment="${2:-}"
                shift 2
                ;;
            --help | -h)
                _product_create_usage
                return 0
                ;;
            *) die 1 "unknown flag: $1" ;;
        esac
    done

    [[ -z "$name" ]] && die 1 "--name is required"
    [[ -z "$type_acronym" ]] && die 1 "--type is required"

    local pt_id
    pt_id=$(psql_exec -t -A -v acronym="$type_acronym" \
        <<< "SELECT id FROM product_type WHERE acronym = :'acronym'") \
        || die 3 "DB error resolving ProductType"
    pt_id="${pt_id//[[:space:]]/}"
    [[ -z "$pt_id" ]] && die 1 "ProductType '$type_acronym' not found"

    local sql_returning
    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        sql_returning="RETURNING json_build_object('id', id, 'name', name, 'version', version)"
    else
        sql_returning="RETURNING id"
    fi

    local sql='INSERT INTO product (id, "productTypeId", name, version, "generatedAt", size, "isDefault", comment)
        VALUES (
            gen_random_uuid(),
            :'"'"'pt_id'"'"',
            :'"'"'name'"'"',
            NULLIF(:'"'"'version'"'"', '"'"''"'"'),
            NULLIF(:'"'"'generated_at'"'"', '"'"''"'"')::timestamptz,
            NULLIF(:'"'"'size'"'"', '"'"''"'"')::bigint,
            :is_default,
            NULLIF(:'"'"'comment'"'"', '"'"''"'"')
        )
        '"$sql_returning"

    local result
    if ! result=$(psql_exec -t -A \
        -v pt_id="$pt_id" \
        -v name="$name" \
        -v version="$version" \
        -v generated_at="$generated_at" \
        -v size="$size" \
        -v is_default="$is_default" \
        -v comment="$comment" \
        <<< "$sql" 2>&1); then
        if [[ "$result" == *"duplicate key"* ]] || [[ "$result" == *"unique constraint"* ]]; then
            die 1 "Product '$name' version '${version:-(none)}' already exists"
        fi
        die 3 "DB error during INSERT: $result"
    fi

    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        printf '%s\n' "$result"
    else
        local id="${result//[[:space:]]/}"
        printf 'Created product %s (%s)\n' "$name" "$id"
    fi
}

# ---------- delete ----------

_product_delete_usage() {
    cat <<EOF
Delete a Product from the database (does NOT remove disk files).

Usage:
  dpmc-db product delete <name> [--version <v>]

Options:
  --version <v>   Disambiguate when multiple versions of the name exist.
                  Use --version "" to target the row with NULL version.
EOF
}

cmd_product_delete() {
    local name="" version="" version_set=0

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version)
                version="${2:-}"
                version_set=1
                shift 2
                ;;
            --help | -h)
                _product_delete_usage
                return 0
                ;;
            -*) die 1 "unknown flag: $1" ;;
            *)
                [[ -n "$name" ]] && die 1 "too many arguments"
                name="$1"
                shift
                ;;
        esac
    done

    [[ -z "$name" ]] && die 1 "<name> is required"

    local target_id target_version
    _resolve_product_by_name "$name" "$version" "$version_set"
    target_id="$RESOLVED_ID"
    target_version="$RESOLVED_VERSION"

    psql_exec -v id="$target_id" \
        >/dev/null \
        <<< "DELETE FROM product WHERE id = :'id'" \
        || die 3 "DB error during DELETE"

    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        local v_json="null"
        [[ -n "$target_version" ]] && v_json="\"$target_version\""
        printf '{"id":"%s","name":"%s","version":%s}\n' "$target_id" "$name" "$v_json"
    else
        printf 'Deleted product %s\n' "$name"
    fi
}

# ---------- list ----------

_product_list_usage() {
    cat <<EOF
List products with optional filters.

Usage:
  dpmc-db product list [--name-like <p>] [--type <a>] [--with-size]

Options:
  --name-like <p>   ILIKE filter on name (substring match)
  --type <a>        Filter by ProductType acronym
  --with-size       Include human-readable size column
EOF
}

cmd_product_list() {
    local name_like="" type_acronym="" with_size=0

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --name-like)
                name_like="${2:-}"
                shift 2
                ;;
            --type)
                type_acronym="${2:-}"
                shift 2
                ;;
            --with-size)
                with_size=1
                shift
                ;;
            --help | -h)
                _product_list_usage
                return 0
                ;;
            *) die 1 "unknown flag: $1" ;;
        esac
    done

    local cols='p.name, COALESCE(p.version, '"'"'(none)'"'"') AS version, pt.acronym AS type, COALESCE(p."generatedAt"::text, '"'"''"'"') AS generated_at'
    if [[ "$with_size" == "1" ]]; then
        cols="$cols, COALESCE(pg_size_pretty(p.size), '') AS size"
    fi

    local where=""
    local args=()
    if [[ -n "$name_like" ]]; then
        where="${where:+$where AND }p.name ILIKE '%' || :'name_like' || '%'"
        args+=(-v "name_like=$name_like")
    fi
    if [[ -n "$type_acronym" ]]; then
        where="${where:+$where AND }pt.acronym = :'type_acronym'"
        args+=(-v "type_acronym=$type_acronym")
    fi
    [[ -n "$where" ]] && where="WHERE $where"

    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        local sql="SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
            FROM (
                SELECT $cols
                FROM product p
                JOIN product_type pt ON pt.id = p.\"productTypeId\"
                $where
                ORDER BY p.name, p.version NULLS FIRST
            ) t"
        psql_exec -t -A "${args[@]}" <<< "$sql" \
            || die 3 "DB error during SELECT"
    else
        local sql="SELECT $cols
            FROM product p
            JOIN product_type pt ON pt.id = p.\"productTypeId\"
            $where
            ORDER BY p.name, p.version NULLS FIRST"
        local rows
        rows=$(psql_exec -t -A -F $'\t' "${args[@]}" <<< "$sql") \
            || die 3 "DB error during SELECT"
        if [[ -z "$rows" ]]; then
            echo "(no products found)"
            return 0
        fi
        local header
        if [[ "$with_size" == "1" ]]; then
            header=$'name\tversion\ttype\tgenerated_at\tsize'
        else
            header=$'name\tversion\ttype\tgenerated_at'
        fi
        {
            printf '%s\n' "$header"
            printf '%s\n' "$rows"
        } | column -t -s $'\t'
    fi
}

# ---------- get ----------

_product_get_usage() {
    cat <<EOF
Get a single product by name or id.

Usage:
  dpmc-db product get <name-or-id> [--version <v>]
EOF
}

cmd_product_get() {
    local arg="" version="" version_set=0

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version)
                version="${2:-}"
                version_set=1
                shift 2
                ;;
            --help | -h)
                _product_get_usage
                return 0
                ;;
            -*) die 1 "unknown flag: $1" ;;
            *)
                [[ -n "$arg" ]] && die 1 "too many arguments"
                arg="$1"
                shift
                ;;
        esac
    done

    [[ -z "$arg" ]] && die 1 "<name-or-id> is required"

    local product_id=""
    if is_uuid "$arg"; then
        product_id="$arg"
    else
        _resolve_product_by_name "$arg" "$version" "$version_set"
        product_id="$RESOLVED_ID"
    fi

    if [[ "${JSON_OUTPUT:-0}" == "1" ]]; then
        local sql='SELECT row_to_json(t) FROM (
            SELECT p.*, pt.acronym AS product_type_acronym
            FROM product p
            LEFT JOIN product_type pt ON pt.id = p."productTypeId"
            WHERE p.id = :'"'"'id'"'"'
        ) t'
        local out
        out=$(psql_exec -t -A -v id="$product_id" <<< "$sql") \
            || die 3 "DB error during SELECT"
        [[ -z "$out" ]] && die 1 "Product not found (id: $product_id)"
        printf '%s\n' "$out"
    else
        local sql='SELECT
            p.id,
            p.name,
            COALESCE(p.version, '"'"'(none)'"'"'),
            COALESCE(pt.acronym, '"'"'(unknown)'"'"'),
            p."productTypeId",
            p."isDefault"::text,
            COALESCE(p.size::text, '"'"'(none)'"'"'),
            COALESCE(p."generatedAt"::text, '"'"'(none)'"'"'),
            COALESCE(p."parentBatchId", '"'"'(none)'"'"'),
            COALESCE(p.parameters::text, '"'"'(none)'"'"'),
            COALESCE(p.comment, '"'"'(none)'"'"'),
            p."createdAt"::text
            FROM product p
            LEFT JOIN product_type pt ON pt.id = p."productTypeId"
            WHERE p.id = :'"'"'id'"'"''
        local out
        out=$(psql_exec -t -A -F $'\t' -v id="$product_id" <<< "$sql") \
            || die 3 "DB error during SELECT"
        [[ -z "$out" ]] && die 1 "Product not found (id: $product_id)"

        local fields=("id" "name" "version" "type" "productTypeId" "isDefault"
            "size" "generatedAt" "parentBatchId" "parameters" "comment" "createdAt")
        local IFS=$'\t'
        local values
        read -ra values <<< "$out"
        local i
        for i in "${!fields[@]}"; do
            printf '%s: %s\n' "${fields[$i]}" "${values[$i]:-}"
        done
    fi
}

# ---------- helpers ----------

# Resolves a product by name (with optional version disambiguation).
# Sets RESOLVED_ID and RESOLVED_VERSION (empty string for NULL version).
_resolve_product_by_name() {
    local name="$1" version="$2" version_set="$3"

    local rows
    rows=$(psql_exec -t -A -F'|' -v name="$name" \
        <<< "SELECT id, COALESCE(version, '') FROM product WHERE name = :'name'") \
        || die 3 "DB error during SELECT"
    [[ -z "$rows" ]] && die 1 "Product '$name' not found"

    if [[ "$version_set" == "1" ]]; then
        local row_id row_version
        while IFS='|' read -r row_id row_version; do
            [[ -z "$row_id" ]] && continue
            if [[ "$row_version" == "$version" ]]; then
                RESOLVED_ID="$row_id"
                RESOLVED_VERSION="$row_version"
                return 0
            fi
        done <<< "$rows"
        die 1 "Product '$name' version '${version:-(none)}' not found"
    else
        local count
        count=$(printf '%s\n' "$rows" | grep -c '|' || true)
        if [[ "$count" -gt 1 ]]; then
            local versions
            versions=$(printf '%s\n' "$rows" \
                | awk -F'|' '{ print ($2 == "" ? "(none)" : $2) }' \
                | paste -sd ', ' -)
            die 1 "Multiple products named '$name' found, use --version: $versions"
        fi
        RESOLVED_ID=$(printf '%s' "$rows" | head -n1 | cut -d'|' -f1)
        RESOLVED_ID="${RESOLVED_ID//[[:space:]]/}"
        RESOLVED_VERSION=$(printf '%s' "$rows" | head -n1 | cut -d'|' -f2)
    fi
}
