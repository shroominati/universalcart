# What UniversalCart Proves Today

## What is it

UniversalCart is a cross-site universal shopping cart with an inspectable trust layer. It exists in two forms:

1. **Chrome extension** — a side panel that lives on top of real websites. Visit any online store, add products, check out once across all of them. Every transaction step produces a typed claim envelope you can inspect.
2. **Standalone web app** — a Next.js demo with 6 mock vendors, the same claim chain model, and a full trust mode panel.

Both share the same architectural idea: multi-vendor commerce where every order step is a typed, dependency-linked, inspectable claim. Neither is a Verum feature or a fork of Verum. Both consume Verum through a clean adapter boundary.

## What is real

These things work end-to-end today with zero external dependencies:

- **Cross-site shopping (extension)** — browse real websites, auto-detect products via JSON-LD / Open Graph / DOM heuristics / site-specific adapters, add to a universal cart that persists across tabs
- **Multi-vendor cart and checkout** — items from different stores in one cart, single checkout, per-vendor sub-orders
- **Claim chain model** — every vendor order produces a `payment.intent → vendor.order.confirmed → fulfillment.acknowledged → delivery.confirmed` chain with dependency-linked content hashes
- **Real SHA-256 hashes (extension)** — content hashes use Web Crypto API, not random hex
- **ClaimEnvelopeV1 shapes** — claims follow the Verum envelope structure: typed claims, `did:key` issuers, content hashes, Ed25519 signatures, explicit dependency arrays
- **Full claim inspection** — click any claim to see issuer DID, hash, signature, dependencies, verification status, and envelope metadata
- **Promo Intelligence (extension)** — detects visible discounts, coupon code fields, and signup offers on real web pages. Builds a per-store savings plan with typed sources (`site_detected`, `user_added`, `signup_offer`, etc.), typed confidence (`verified`, `likely`, `weak`), and typed actions (`auto_apply`, `user_apply`, `open_signup`). Every savings number is labeled "estimated." Signup offers require explicit user action — no silent signups, no fake codes, no hidden data submission.
- **Export and shareable reports** — download orders and claims as JSON or a self-contained HTML report; one-click reset for demo replays
- **Provider architecture (web app)** — a typed `VerumProvider` interface with `capabilities`, `mode`, and `warnings` on every result
- **Trust mode transparency** — the UI always shows whether claims are simulated or externally verified
- **Graceful degradation (web app)** — CLI/MCP modes fall back to simulation with explicit warnings; no silent failures
- **Extension ↔ web app integration** — when the web app is running locally, the extension uses it as a claim generation backend, inheriting the web app's configured Verum provider mode
- **56 passing tests** covering mock behavior, fallback honesty, interface contracts, and config parsing

## What is mocked

In the default simulated mode (the only mode that runs without external tooling):

| What | Status | Detail |
|------|--------|--------|
| Ed25519 signatures | Simulated | `ed25519:` prefix + random hex. Structurally valid, not cryptographically real. |
| SHA-256 content hashes | **Real in extension**, simulated in web app | Extension uses Web Crypto `crypto.subtle.digest`. Web app uses random hex. |
| Issuer DID resolution | Simulated | `did:key` strings are generated deterministically from domains (extension) or hardcoded per vendor (web app). No DID document resolution. |
| Chain verification | Simulated | Walks the dependency DAG locally. Checks structure, not cryptographic validity. |
| Payment processing | Simulated | No real payment. Amounts are computed but nothing is charged. |
| Vendor routing | Simulated | Orders are grouped and displayed per vendor but not sent anywhere. |
| Product detection (extension) | Real | JSON-LD, Open Graph, DOM heuristics, site-specific adapters run on actual web pages. |
| Promo detection (extension) | Real detection, estimated savings | Scans visible page text, structured data, and DOM elements for discount signals. Savings numbers are always estimates — the extension cannot confirm a code works without submitting it. |

Every simulated element is labeled as such in the UI. The word "simulated" appears on claim badges, verification summaries, and the inspect drawer. The trust mode panel explains what the current provider can and cannot do.

## What real Verum integration would require

These are the exact gaps between what UniversalCart needs and what Verum currently exposes. None require protocol changes — they are CLI/MCP surface additions.

### CLI gaps

1. **Generic claim step** — `verum step custom --type <type> --issuer <did> --deps <hash,...> --json` that writes to stdout
2. **stdin verify** — `verum verify-claim --stdin` and `verum verify-chain --stdin` accepting JSON
3. **Commerce claim type registry** — register `payment.intent`, `vendor.order.confirmed`, `fulfillment.acknowledged`, `delivery.confirmed` as known types (or allow unregistered types)

### MCP gaps

1. **Commerce tool registrations** — the current 5 tools are procurement-specific; commerce types need their own tools or a generic claim tool
2. **Health/availability endpoint** — stdio-only transport makes availability probing difficult

Full technical detail: [VERUM_INTERFACE_GAPS.md](./VERUM_INTERFACE_GAPS.md)

## Why the separation is intentional

UniversalCart and Verum are different things solving different problems:

| | UniversalCart | Verum |
|---|---|---|
| **What it is** | Product demo / reference app | Trust protocol + coordination layer |
| **Scope** | Multi-vendor commerce UX | Typed claims, signatures, verification |
| **Changes when** | Product requirements change | Protocol semantics change |
| **Owned by** | Product/demo workstream | Protocol workstream |

Keeping them separate means:

1. **Verum is never dragged by demo requirements.** UniversalCart can move fast, break things, and reshape its UX without touching the protocol.
2. **UniversalCart is never blocked by Verum.** Mock mode is fully functional today. Real integration can happen incrementally as Verum's surface expands.
3. **The adapter boundary is the contract.** `VerumProvider` with `capabilities` + `warnings` is the only integration surface. If Verum adds a generic claim step tomorrow, only `CliVerumProvider` changes — the product doesn't.
4. **Testing stays clean.** Mock mode tests never depend on external runtimes. Real integration tests can be isolated in CI with a Verum binary present.

## What comes next — a product decision

UniversalCart is currently a demo product. Two paths forward:

**A. Stay a demo.** Keep it as a standalone showcase of the claim chain model. Use it for presentations, investor conversations, and Verum onboarding. The bar: it should always compile, always look good, and always be honest about what's simulated.

**B. Become a real product.** The extension is the product path. Cross-site commerce with inspectable trust artifacts is a real value proposition. This would mean: real Verum CLI/MCP integration, per-site product detection adapters, actual payment processing, and Chrome Web Store distribution.

**C. Become a Verum reference app.** Graduate it into an official Verum reference implementation. This would mean: real integration tests in CI, documented upgrade path as Verum adds commerce types, and a commitment to keep the adapter boundary stable.

All three paths are valid. The choice depends on:
- **Demo response** — do people care more about the cart, the claims, the promo intelligence, or the extension itself?
- **Market pull** — is there demand for cross-site commerce with trust artifacts and honest discount planning?
- **Pilot conversations** — does anyone want to build on this?

The promo intelligence layer adds a second product story: not just "one cart across stores" but "every store gets an honest discount plan." The market will tell you which story matters more.

Do not decide by adding more code. Decide by showing it to people and seeing what they react to.
