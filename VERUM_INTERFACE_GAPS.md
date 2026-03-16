# Verum Interface Gaps

Exact gaps discovered while building the UniversalCart adapter layer.
These are **not bugs** — they are missing surface area that would need
to exist in Verum for real CLI/MCP integration. Listed here so the
Verum maintainer can prioritize without guesswork.

## CLI Gaps

| Gap | Detail | Workaround in UniversalCart |
|-----|--------|-----------------------------|
| No commerce claim types in `verum step` / `generate-chain` | Current `verum` supports procurement workflows (`step request/evaluate/budget-check/approve` and `generate-chain`), not UniversalCart commerce types like `payment.intent`, `vendor.order.confirmed`, `fulfillment.acknowledged`, `delivery.confirmed`. | Fall back to simulated commerce claims with an explicit warning. |
| Schema mismatch with current Verum JSON | Current `verum` expects native claim JSON with fields like `version`, `claim_type`, `payload`, `dependencies`, and `proof`. UniversalCart still emits a legacy `ClaimEnvelopeV1` shape with `claimType`, `issuedAt`, `contentHash`, and string `signature`. The current CLI rejects that JSON. | Fall back to simulated verification/inspection for UniversalCart claims. |
| No generic custom claim type | There is no `verum step custom --type <arbitrary> --issuer <did> --json` command to create claims of arbitrary type. | Would need this or a commerce-specific step subcommand. |
| No generic sign-from-JSON command | `verify-claim`, `verify-chain`, and `inspect` can read native JSON files, but there is still no CLI command to take an arbitrary commerce claim JSON payload and sign it into a valid Verum-native claim file. | UniversalCart cannot upgrade its current commerce claims to native Verum claims without new CLI surface. |

## MCP Gaps

| Gap | Detail | Workaround in UniversalCart |
|-----|--------|-----------------------------|
| stdio transport only | `verum-mcp-server` uses stdin/stdout JSON-RPC (MCP protocol). There is no HTTP endpoint. | UniversalCart would need an MCP client library or a thin HTTP-to-stdio bridge. |
| Procurement tools only | The 5 MCP tools are `verum.procurement.{request, evaluate, budget_check, approve, verify_chain}`. No commerce/order tools exist. | Fall back to mock claims. |
| No `/health` endpoint | Since the server is stdio-only, there is no way to probe availability over HTTP. | Availability check always fails; provider falls back. |

## What Verum Would Need (Minimal)

To enable real UniversalCart → Verum integration:

1. **Generic claim step** — `verum step custom --type <type> --issuer <did> --deps <hash,...> --json` that writes to stdout.
2. **Commerce-native claim schema support** — either let UniversalCart submit its commerce claim JSON directly or expose a documented way to construct valid native Verum claim JSON for arbitrary claim types.
3. **Commerce claim type registry** — register `payment.intent`, `vendor.order.confirmed`, `fulfillment.acknowledged`, `delivery.confirmed` as known claim types (or allow unregistered types).
4. **HTTP bridge for MCP** — either a `--http` flag on `verum-mcp-server` or a documented sidecar pattern.

None of these require protocol changes — they are CLI/MCP surface additions.
