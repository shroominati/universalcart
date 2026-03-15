# UniversalCart

**Shop everywhere. Checkout once.**

A multi-vendor shopping platform where you add items from multiple stores into a single cart and process everything in one transaction. Every step — payment, vendor confirmation, fulfillment, delivery — is tracked through a pluggable Verum protocol adapter.

UniversalCart exists in two forms:

1. **Chrome extension** (`extension/`) — a side panel on top of real websites. Visit any store, add products, get a per-store discount plan, check out once with inspectable claim chains. See [extension/README.md](./extension/README.md).
2. **Web app** (`src/`) — a standalone Next.js demo with 6 mock vendors, full trust mode panel, and the same claim chain model.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verum Integration Modes

UniversalCart runs in three modes, controlled by the `NEXT_PUBLIC_VERUM_MODE` environment variable:

| Mode | Default | Runtime Dependency | What's Real | What's Simulated |
|------|---------|-------------------|-------------|-----------------|
| `mock` | Yes | None | Nothing — pure local demo | All claims, signatures, and verification |
| `cli` | No | `verum` binary on PATH | Verification and inspection (when Verum supports the commerce types) | Claim generation (commerce types not in Verum CLI today) |
| `mcp` | No | `verum-mcp-server` binary | Verification via MCP tools (when commerce tools exist) | Claim generation (MCP exposes procurement tools only today) |

### Switching Modes

Edit `.env.local`:

```bash
# Mock mode (default, zero dependencies)
NEXT_PUBLIC_VERUM_MODE=mock

# CLI mode (requires verum binary)
NEXT_PUBLIC_VERUM_MODE=cli
VERUM_CLI_PATH=/path/to/verum          # optional, defaults to "verum"

# MCP mode (requires verum-mcp-server)
NEXT_PUBLIC_VERUM_MODE=mcp
VERUM_MCP_COMMAND=verum-mcp-server     # optional, defaults to "verum-mcp-server"
VERUM_MCP_ARGS=                        # optional, space-separated args
```

The current mode is visible in the UI:
- **Navbar** shows the active mode badge (Simulated / Verum CLI / Verum MCP)
- **Checkout** labels claims as simulated or cryptographically signed
- **Orders** timeline distinguishes simulated vs verified claims, shows mode tag
- **Cart drawer** shows mode-aware messaging
- **Degradation notices** appear when CLI/MCP falls back to simulated claims

### Graceful Fallback (Never Silent)

If CLI or MCP mode is enabled but the runtime is unavailable:
1. Every result carries a `warnings` array describing exactly what degraded and why
2. Operations fall back to simulated claims automatically
3. The UI surfaces degradation notices so the user is never misled
4. Claims generated during fallback have the same envelope structure as mock claims

**No silent fallback.** The user always knows which parts are simulated.

## Architecture

### Verum Adapter Boundary

All Verum interaction goes through `src/lib/verum/`:

```
src/lib/verum/
├── index.ts        # Public API: getVerumProvider(), convenience functions, re-exports
├── provider.ts     # VerumProvider interface + all shared types
├── config.ts       # Mode selection from environment
├── mock.ts         # MockVerumProvider — pure JS, no I/O
├── cli.ts          # CliVerumProvider — shells out to verum binary (server-only)
└── mcp.ts          # McpVerumProvider — connects to verum-mcp-server (server-only)
```

### Provider Interface

```typescript
interface VerumProvider {
  readonly mode: "mock" | "cli" | "mcp";
  readonly capabilities: VerumProviderCapabilities;
  createOrderClaimChain(req): Promise<OrderClaimChainResult>;
  verifyClaim(claim): Promise<ClaimVerificationResult>;
  verifyClaimChain(claims): Promise<ChainVerificationResult>;
  inspectClaim(claim): Promise<ClaimInspectionResult>;
}

interface VerumProviderCapabilities {
  generateClaims: boolean;    // can this provider create claims?
  verifyClaims: boolean;      // can this provider verify claims?
  inspectClaims: boolean;     // can this provider inspect claims?
  explainMode: string;        // human-readable explanation of what this mode does
}
```

Every result type carries `mode` and `warnings` fields so the UI can always display what happened honestly.

### Provider Capabilities

| Provider | generateClaims | verifyClaims | inspectClaims |
|----------|---------------|-------------|---------------|
| Mock | true | true | true |
| CLI | false (commerce types unsupported) | false (file-path-only API) | false → true (when binary found) |
| MCP | false (procurement tools only) | false (stdio transport gap) | false (no inspect tool) |

### Claim Chain Model

Each vendor order generates a Verum `ClaimEnvelopeV1` chain:

```
payment.intent (platform key) → vendor.order.confirmed (vendor key)
```

Extended chain (fulfillment/delivery added as order progresses):

```
payment.intent → vendor.order.confirmed → fulfillment.acknowledged → delivery.confirmed
```

### Data Flow

1. **Checkout page** calls `createOrderClaimChain()` for each vendor
2. Result includes `{ mode, claims, warnings }`
3. Claims are passed to the store's `checkout(vendorClaims)` method
4. Store creates the order with claims attached to each vendor sub-order
5. **Orders page** calls `verifyClaimChain()` to verify the claim DAG
6. UI components read mode via `getVerumMode()` and render accordingly
7. Any warnings from results are surfaced as "Degradation Notices" in the UI

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Storefront with hero, vendor showcase, product grid
│   ├── checkout/page.tsx     # Multi-phase checkout with warning display
│   ├── orders/page.tsx       # Order history with verification + warnings
│   ├── vendors/page.tsx      # Individual vendor pages
│   └── api/
│       ├── verum/route.ts    # Verum provider operations (server-side)
│       ├── checkout/route.ts # Server-side checkout orchestration
│       └── orders/route.ts   # Order persistence (placeholder)
├── components/
│   ├── Navbar.tsx            # Navigation with mode badge
│   ├── ProductCard.tsx       # Product display with vendor badge
│   ├── CartDrawer.tsx        # Slide-out cart with mode messaging
│   ├── VendorFilter.tsx      # Vendor filter pills
│   ├── VendorBadge.tsx       # Vendor identity chip
│   ├── VerumBadge.tsx        # Claim status with mock/real indicator
│   ├── OrderTimeline.tsx     # Verum claim chain visualization
│   └── TrustModeBadge.tsx    # Mode indicator component
└── lib/
    ├── types.ts              # TypeScript interfaces
    ├── data.ts               # Mock vendors and products
    ├── store.ts              # Zustand store (cart, orders)
    └── verum/                # ← Verum adapter boundary
        ├── index.ts
        ├── provider.ts
        ├── config.ts
        ├── mock.ts
        ├── cli.ts
        └── mcp.ts
```

## Testing

```bash
npm test          # run all tests
npm run test:watch # watch mode
```

Tests cover:
- **MockVerumProvider**: claim creation, structure validity, chain verification, dependency detection, inspection
- **CliVerumProvider**: graceful fallback with warnings when binary unavailable
- **McpVerumProvider**: graceful fallback with warnings when server unreachable
- **Provider interface contract**: all providers satisfy the same typed behavioral contract (mode, capabilities, all methods, result shapes)
- **Fallback honesty**: CLI and MCP providers *never* return empty warnings when falling back
- **Config**: mode selection defaults, env var reading, MCP command/args parsing

## Verum Interface Gaps

See [VERUM_INTERFACE_GAPS.md](./VERUM_INTERFACE_GAPS.md) for exact gaps between UniversalCart's needs and Verum's current CLI/MCP surface. These are documented without patching Verum.

## Status

UniversalCart is in **demo freeze** as of March 2026. Only bug fixes, copy polish, and visual polish are allowed. See [WHAT_THIS_PROVES.md](./WHAT_THIS_PROVES.md) for what is real, what is mocked, and why.

## Tech Stack

**Web app:**
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Zustand (client state with persistence), Framer Motion, Lucide React
- Vitest (56 tests)

**Chrome extension:**
- Manifest V3, Chrome Side Panel API, Chrome Storage API
- Web Crypto API (real SHA-256), Shadow DOM (content script isolation)
- Promo Intelligence model (typed sources, confidence, planning)
