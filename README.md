# UniversalCart

**Shop everywhere. Checkout once.**

A multi-vendor shopping platform where you add items from multiple stores into a single cart and process everything in one transaction. Every step — payment, vendor confirmation, fulfillment, delivery — is tracked through a pluggable Verum protocol adapter.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verum Integration Modes

UniversalCart runs in three modes, controlled by the `NEXT_PUBLIC_VERUM_MODE` environment variable:

| Mode | Default | Runtime Dependency | Description |
|------|---------|-------------------|-------------|
| `mock` | Yes | None | Claims simulated locally. No Verum binary or server needed. |
| `cli` | No | `verum` binary on PATH | Shells out to `verum-cli` for claim operations. Falls back to mock if unavailable. |
| `mcp` | No | `verum-mcp-server` running | Connects to Verum MCP server. Falls back to mock if unreachable. |

### Switching Modes

Edit `.env.local`:

```bash
# Mock mode (default, zero dependencies)
NEXT_PUBLIC_VERUM_MODE=mock

# CLI mode (requires verum binary)
NEXT_PUBLIC_VERUM_MODE=cli
VERUM_CLI_PATH=/path/to/verum    # optional, defaults to "verum"

# MCP mode (requires verum-mcp-server)
NEXT_PUBLIC_VERUM_MODE=mcp
VERUM_MCP_HOST=localhost          # optional, defaults to localhost
VERUM_MCP_PORT=3100               # optional, defaults to 3100
```

The current mode is visible in the UI:
- **Navbar** shows the active mode badge (Simulated / Verum CLI / Verum MCP)
- **Checkout** labels claims as simulated or cryptographically signed
- **Orders** timeline distinguishes simulated vs verified claims
- **Cart drawer** shows mode-aware messaging

### Graceful Fallback

If CLI or MCP mode is enabled but the runtime is unavailable:
1. The provider logs a warning to the console
2. Operations fall back to mock mode automatically
3. The app continues to work — no crash, no broken UI
4. Claims generated during fallback have the same structure as mock claims

## Architecture

### Verum Adapter Boundary

All Verum interaction goes through `src/lib/verum/`:

```
src/lib/verum/
├── index.ts        # Public API: getVerumProvider(), convenience functions, re-exports
├── provider.ts     # VerumProvider interface + shared types
├── config.ts       # Mode selection from environment
├── mock.ts         # MockVerumProvider — pure JS, no I/O
├── cli.ts          # CliVerumProvider — shells out to verum binary (server-only)
└── mcp.ts          # McpVerumProvider — connects to verum-mcp-server (server-only)
```

The provider interface:

```typescript
interface VerumProvider {
  readonly mode: "mock" | "cli" | "mcp";
  createOrderClaimChain(req: CreateClaimChainRequest): Promise<VerumClaim[]>;
  verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult>;
  verifyClaimChain(claims: VerumClaim[]): Promise<ChainVerificationResult>;
}
```

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
2. Claims are passed to the store's `checkout(vendorClaims)` method
3. Store creates the order with claims attached to each vendor sub-order
4. **Orders page** calls `verifyClaimChain()` to verify the claim DAG
5. UI components read mode via `getVerumMode()` and render accordingly

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Storefront with hero, vendor showcase, product grid
│   ├── checkout/page.tsx     # Multi-phase checkout with provider-driven claims
│   ├── orders/page.tsx       # Order history with verification timeline
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
- MockVerumProvider: claim creation, structure validity, chain verification, dependency detection
- CliVerumProvider: graceful fallback when binary unavailable, claim structure after fallback
- McpVerumProvider: graceful fallback when server unreachable, claim structure after fallback
- Provider interface contract: all providers satisfy the same behavioral contract
- Config: mode selection defaults, env var reading, invalid mode fallback

## Verum Interface Gaps

See [VERUM_INTERFACE_GAPS.md](./VERUM_INTERFACE_GAPS.md) for exact gaps between UniversalCart's needs and Verum's current CLI/MCP surface. These are documented without patching Verum.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (client state with persistence)
- **Framer Motion** (animations)
- **Lucide React** (icons)
- **Vitest** (testing)
