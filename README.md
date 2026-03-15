# UniversalCart

**Shop everywhere. Checkout once.**

A multi-vendor shopping platform where you add items from multiple stores into a single cart and process everything in one transaction. Every step — payment, vendor confirmation, fulfillment, delivery — is cryptographically signed and verified through the [Verum protocol](https://github.com/your-org/verum).

## How It Works

1. **Browse** products from 6 vendors across electronics, fashion, home, grocery, sports, and beauty
2. **Add to cart** from any combination of vendors — everything goes into one universal cart
3. **Checkout once** — the platform splits your order and routes sub-orders to each vendor
4. **Verum verifies** each step: a claim chain of signed envelopes proves payment was captured, vendors confirmed, items shipped, and delivery completed

## Verum Integration

Each vendor order generates a Verum `ClaimEnvelopeV1` chain:

```
payment.intent (platform key) → vendor.order.confirmed (vendor key) → fulfillment.acknowledged (vendor key) → delivery.confirmed (platform key)
```

- Claims are Ed25519-attested with content-hash dependencies
- Verification walks the DAG and checks signatures, timestamps, and chain integrity
- The `/api/verum` endpoint exposes claim creation and verification

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **Zustand** (client state with persistence)
- **Framer Motion** (animations)
- **Lucide React** (icons)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Storefront with hero, vendor showcase, product grid
│   ├── checkout/page.tsx     # Multi-phase checkout with Verum claim generation
│   ├── orders/page.tsx       # Order history with verification timeline
│   ├── vendors/page.tsx      # Individual vendor pages
│   └── api/
│       ├── verum/route.ts    # Verum claim CRUD and verification
│       ├── checkout/route.ts # Server-side checkout orchestration
│       └── orders/route.ts   # Order persistence (placeholder)
├── components/
│   ├── Navbar.tsx            # Navigation with cart badge
│   ├── ProductCard.tsx       # Product display with vendor badge
│   ├── CartDrawer.tsx        # Slide-out cart grouped by vendor
│   ├── VendorFilter.tsx      # Vendor filter pills
│   ├── VendorBadge.tsx       # Vendor identity chip
│   ├── VerumBadge.tsx        # Claim status indicator
│   └── OrderTimeline.tsx     # Verum claim chain visualization
└── lib/
    ├── types.ts              # TypeScript interfaces
    ├── data.ts               # Mock vendors and products
    ├── store.ts              # Zustand store (cart, orders)
    └── verum.ts              # Verum protocol integration layer
```

## Connecting to Real Verum

The `src/lib/verum.ts` module simulates Verum cryptographic operations with matching data shapes. To connect to the real Verum CLI:

```bash
# Install verum-cli from the Verum repo
cargo install --path /path/to/verum/crates/verum-cli

# The verum.ts module can shell out to:
verum step request -o claim.json --secret-key platform.key
verum verify-chain ./chain --trust-policy policy.json
```

Or connect to the MCP server for agent-to-agent verification:

```bash
verum-mcp-server --trust-policy config/trust-policy.json
```
