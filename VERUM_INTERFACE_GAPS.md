# Verum Interface Gaps

Exact gaps discovered while building the UniversalCart adapter layer.
These are **not bugs** — they are missing surface area that would need
to exist in Verum for real CLI/MCP integration. Listed here so the
Verum maintainer can prioritize without guesswork.

## CLI Gaps

| Gap | Detail | Workaround in UniversalCart |
|-----|--------|-----------------------------|
| No commerce claim types in `verum step` | `verum step` supports procurement types (request, evaluate, budget-check, approve). Commerce types like `payment.intent`, `vendor.order.confirmed`, `fulfillment.acknowledged`, `delivery.confirmed` are not recognized. | Fall back to mock claims with a console warning. |
| No generic custom claim type | There is no `verum step custom --type <arbitrary> --issuer <did> --json` command to create claims of arbitrary type. | Would need this or a commerce-specific step subcommand. |
| `verify-claim` requires file path | `verum verify-claim <file>` expects a file on disk. There is no stdin or inline JSON mode. | Would need to write temp files. Currently falls back to mock. |
| `verify-chain` requires directory | `verum verify-chain <dir>` expects a directory of claim files. No stdin batch mode. | Would need to write claims to a temp dir. Currently falls back to mock. |
| No JSON-on-stdout for `step` output | `verum step request -o <path>` writes to a file but does not echo the claim JSON to stdout. | A `--json` flag on step commands (like verify-chain has) would enable piped workflows. |

## MCP Gaps

| Gap | Detail | Workaround in UniversalCart |
|-----|--------|-----------------------------|
| stdio transport only | `verum-mcp-server` uses stdin/stdout JSON-RPC (MCP protocol). There is no HTTP endpoint. | UniversalCart would need an MCP client library or a thin HTTP-to-stdio bridge. |
| Procurement tools only | The 5 MCP tools are `verum.procurement.{request, evaluate, budget_check, approve, verify_chain}`. No commerce/order tools exist. | Fall back to mock claims. |
| No `/health` endpoint | Since the server is stdio-only, there is no way to probe availability over HTTP. | Availability check always fails; provider falls back. |

## What Verum Would Need (Minimal)

To enable real UniversalCart → Verum integration:

1. **Generic claim step** — `verum step custom --type <type> --issuer <did> --deps <hash,...> --json` that writes to stdout.
2. **stdin verify** — `verum verify-claim --stdin` and `verum verify-chain --stdin` accepting JSON arrays.
3. **Commerce claim type registry** — register `payment.intent`, `vendor.order.confirmed`, `fulfillment.acknowledged`, `delivery.confirmed` as known claim types (or allow unregistered types).
4. **HTTP bridge for MCP** — either a `--http` flag on `verum-mcp-server` or a documented sidecar pattern.

None of these require protocol changes — they are CLI/MCP surface additions.
