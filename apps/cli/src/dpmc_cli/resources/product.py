"""`dpmc product` subcommands."""

from __future__ import annotations

import json as _json
import re
from typing import Any, cast

import typer

from dpmc_cli.api.client import ApiClient
from dpmc_cli.api.odata import odata_filter, odata_string_literal
from dpmc_cli.auth.token_store import TokenStore
from dpmc_cli.config import CliConfig
from dpmc_cli.errors import CliError, cli_command

product_app = typer.Typer(help="Manage products.", no_args_is_help=True)


def _client() -> ApiClient:
    cfg = CliConfig()
    return ApiClient(cfg, TokenStore(cfg))


def _human_size(n: int | None) -> str:
    if n is None:
        return ""
    units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    val = float(n)
    for unit in units:
        if val < 1024 or unit == units[-1]:
            return f"{val:.1f} {unit}" if unit != "B" else f"{int(val)} {unit}"
        val /= 1024
    return f"{n} B"


def _print_table(headers: list[str], rows: list[list[str]]) -> None:
    if not rows:
        typer.echo("(no products found)")
        return
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    fmt = "  ".join(f"{{:<{w}}}" for w in widths)
    typer.echo(fmt.format(*headers))
    for row in rows:
        typer.echo(fmt.format(*row))


@product_app.command("list")
@cli_command
def product_list(
    ctx: typer.Context,
    name_like: str | None = typer.Option(None, "--name-like"),
    type_: str | None = typer.Option(None, "--type"),
    with_size: bool = typer.Option(False, "--with-size"),
) -> None:
    clauses: list[tuple[str, str, Any]] = []
    if name_like:
        clauses.append(("name", "substringof", name_like))
    if type_:
        clauses.append(("productType/acronym", "eq", type_))

    params: dict[str, str] = {
        "$select": "name,version,generatedAt,size",
        "$expand": "productType",
        "$orderby": "name,version",
    }
    flt = odata_filter(clauses)  # type: ignore[arg-type]
    if flt:
        params["$filter"] = flt

    body = _client().get("/odata/product", params=params)
    rows = body.get("value", [])

    json_mode = bool(ctx.obj and ctx.obj.get("json"))
    projected = [
        {
            "name": r.get("name"),
            "version": r.get("version"),
            "type": (r.get("productType") or {}).get("acronym"),
            "generated_at": r.get("generatedAt"),
            **({"size": r.get("size")} if with_size else {}),
        }
        for r in rows
    ]

    if json_mode:
        typer.echo(_json.dumps(projected))
        return

    headers = ["name", "version", "type", "generated_at"]
    if with_size:
        headers.append("size")
    text_rows: list[list[str]] = []
    for p in projected:
        row = [
            str(p["name"] or ""),
            str(p["version"] or "(none)"),
            str(p["type"] or "(unknown)"),
            str(p["generated_at"] or ""),
        ]
        if with_size:
            row.append(_human_size(p.get("size")))
        text_rows.append(row)
    _print_table(headers, text_rows)


_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _resolve_product_id(client: ApiClient, name: str, version: str | None, version_set: bool) -> str:
    body = client.get(
        "/odata/product",
        params={"$select": "id,version", "$filter": f"name eq {odata_string_literal(name)}"},
    )
    rows = body.get("value", [])
    if not rows:
        raise CliError(1, f"Product '{name}' not found")

    if version_set:
        for r in rows:
            if (r.get("version") or "") == (version or ""):
                return cast(str, r["id"])
        raise CliError(1, f"Product '{name}' version '{version or '(none)'}' not found")

    if len(rows) > 1:
        vs = ", ".join((r.get("version") or "(none)") for r in rows)
        raise CliError(1, f"Multiple products named '{name}' found, use --version: {vs}")

    return cast(str, rows[0]["id"])


@product_app.command("get")
@cli_command
def product_get(
    ctx: typer.Context,
    name_or_id: str = typer.Argument(...),
    version: str | None = typer.Option(None, "--version"),
) -> None:
    client = _client()
    if _UUID_RE.match(name_or_id):
        product_id = name_or_id
    else:
        product_id = _resolve_product_id(
            client, name_or_id, version, version_set=version is not None
        )

    body = client.get(
        f"/odata/product/{product_id}", params={"$expand": "productType"}
    )

    json_mode = bool(ctx.obj and ctx.obj.get("json"))
    if json_mode:
        typer.echo(_json.dumps(body))
        return

    pt_acronym = (body.get("productType") or {}).get("acronym") or "(unknown)"
    fields = [
        ("id", body.get("id")),
        ("name", body.get("name")),
        ("version", body.get("version") or "(none)"),
        ("type", pt_acronym),
        ("productTypeId", body.get("productTypeId")),
        ("isDefault", body.get("isDefault")),
        ("size", body.get("size") if body.get("size") is not None else "(none)"),
        ("generatedAt", body.get("generatedAt") or "(none)"),
        ("parentBatchId", body.get("parentBatchId") or "(none)"),
        ("parameters", body.get("parameters") if body.get("parameters") is not None else "(none)"),
        ("comment", body.get("comment") or "(none)"),
        ("createdAt", body.get("createdAt")),
    ]
    for k, v in fields:
        typer.echo(f"{k}: {v}")


def _resolve_product_type_id(client: ApiClient, acronym: str) -> str:
    body = client.get(
        "/odata/product-type",
        params={
            "$select": "id,acronym",
            "$filter": f"acronym eq {odata_string_literal(acronym)}",
        },
    )
    rows = body.get("value", [])
    if not rows:
        raise CliError(1, f"ProductType '{acronym}' not found")
    return cast(str, rows[0]["id"])


@product_app.command("create")
@cli_command
def product_create(
    ctx: typer.Context,
    name: str = typer.Option(..., "--name"),
    type_: str = typer.Option(..., "--type"),
    version: str | None = typer.Option(None, "--version"),
    generated_at: str | None = typer.Option(None, "--generated-at"),
    size: int | None = typer.Option(None, "--size"),
    is_default: bool = typer.Option(False, "--default"),
    comment: str | None = typer.Option(None, "--comment"),
) -> None:
    client = _client()
    pt_id = _resolve_product_type_id(client, type_)

    body: dict[str, Any] = {"name": name, "productTypeId": pt_id, "isDefault": is_default}
    if version is not None:
        body["version"] = version
    if generated_at is not None:
        body["generatedAt"] = generated_at
    if size is not None:
        body["size"] = size
    if comment is not None:
        body["comment"] = comment

    created = client.post("/odata/product", json=body)

    json_mode = bool(ctx.obj and ctx.obj.get("json"))
    if json_mode:
        typer.echo(_json.dumps(created))
    else:
        typer.echo(f"Created product {name} ({created.get('id', '?')})")


def _resolve_product_id_and_version(
    client: ApiClient, name: str, version: str | None, version_set: bool
) -> tuple[str, str | None]:
    body = client.get(
        "/odata/product",
        params={"$select": "id,version", "$filter": f"name eq {odata_string_literal(name)}"},
    )
    rows = body.get("value", [])
    if not rows:
        raise CliError(1, f"Product '{name}' not found")

    if version_set:
        for r in rows:
            if (r.get("version") or "") == (version or ""):
                return r["id"], r.get("version")
        raise CliError(1, f"Product '{name}' version '{version or '(none)'}' not found")

    if len(rows) > 1:
        vs = ", ".join((r.get("version") or "(none)") for r in rows)
        raise CliError(1, f"Multiple products named '{name}' found, use --version: {vs}")

    return rows[0]["id"], rows[0].get("version")


@product_app.command("delete")
@cli_command
def product_delete(
    ctx: typer.Context,
    name: str = typer.Argument(...),
    version: str | None = typer.Option(None, "--version"),
) -> None:
    client = _client()
    product_id, resolved_version = _resolve_product_id_and_version(
        client, name, version, version_set=version is not None
    )
    client.delete(f"/odata/product/{product_id}")

    json_mode = bool(ctx.obj and ctx.obj.get("json"))
    if json_mode:
        typer.echo(_json.dumps({"id": product_id, "name": name, "version": resolved_version}))
    else:
        typer.echo(f"Deleted product {name}")
