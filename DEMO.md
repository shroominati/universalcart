# UniversalCart Demo Script

A clean walkthrough for showing UniversalCart to anyone — investor, engineer, or collaborator. Takes about 3 minutes.

## Setup

```bash
npm install
npm run dev
```

Confirm `NEXT_PUBLIC_VERUM_MODE=mock` in `.env.local` (default). Open http://localhost:3000.

## The Walkthrough

### 1. Landing Page (/)

**What to show:** The hero message and the store directory.

**Talk track:** "UniversalCart lets you browse independent stores on the web and add items into one universal cart. You're not shopping in one marketplace — you're visiting separate stores, and the cart follows you."

**Demo action:** Scroll down to the "Browse Stores" section. Point out the six distinct storefronts — each has its own brand, category, rating, and `did:key` identity.

### 2. Visit Aurora Electronics

Click the **Aurora Electronics** store card.

**What to show:** The vendor page with the indigo-themed hero, the vendor's DID, and their product grid.

**Talk track:** "This is Aurora Electronics — their own storefront with their own identity. Notice the Verum DID at the top. That's the vendor's decentralized identifier."

**Demo action:** Add **Nova Wireless Earbuds Pro** ($149.99) to the cart. Note the "Added" confirmation.

### 3. Visit Thread & Co.

Click "Back to Stores" and then click the **Thread & Co.** store card.

**What to show:** The page changes — different color theme (pink), different category (fashion). This feels like a different website.

**Talk track:** "Now we're at Thread & Co., a completely different store. But the same universal cart icon in the top-right still shows our item from Aurora."

**Demo action:** Add **Merino Wool Crewneck** ($98.00) to the cart.

### 4. Visit Green Basket

Click "Back to Stores" and then click the **Green Basket** store card.

**What to show:** Green theme, organic grocery catalog.

**Talk track:** "Third store, third vendor. An organic grocery. The cart now has items from three independent vendors."

**Demo action:** Add **Artisan Sourdough Loaf** ($8.50) to the cart.

### 5. Open the Cart

Click the cart icon in the navbar. Note:

- Items grouped by vendor with subtotals
- Three separate vendors, one cart
- Trust mode callout at the bottom — amber "Simulated" badge
- The message is honest: "claims generated locally, not cryptographically signed"

**Total: $256.49** across 3 vendors.

**Talk track:** "Three stores, three vendors, one cart. When we check out, the platform generates a separate claim chain per vendor."

### 6. Checkout (/checkout)

Click "Checkout". On the review page:

- **Left column:** vendor-grouped order cards with line items
- **Right sidebar:** order summary + **Trust Mode Panel** (click to expand)

**Demo the Trust Mode Panel:** Click to expand. Show:
- All three capabilities marked "ACTIVE" with "simulated" context
- The explainMode text describing exactly what mock mode does
- The env var hint at the bottom

Click "Place Order — $256.49".

### 7. Watch the Processing Flow

Two animated phases:
1. **Processing Payment** — spinner with vendor cards
2. **Generating Simulated Claims** — amber mock-mode callout, vendor cards animate

**Talk track:** "In mock mode, the claim generation happens locally and instantly. In CLI or MCP mode, this would shell out to the Verum binary or MCP server."

### 8. Confirmation Screen

After ~2 seconds, the confirmation appears:

- Green checkmark, order ID, total
- **Trust Mode Panel** (expanded shows capabilities)
- **Verum Claim Chain** section with per-vendor claims

**Demo the Inspect Drawer:** Click any claim badge (e.g., "Payment Intent"). The drawer slides in showing:

- Trust mode indicator at top
- Claim type with description
- Issuer DID (with copy button)
- Content hash (SHA-256 format, simulated — with copy button)
- Ed25519 signature (with copy button)
- Dependencies (root claim has none; vendor confirm links to payment hash)
- Verification status — "valid (simulated)"
- Envelope metadata — version, issued time, claim ID

**Talk track:** "Every claim is fully inspectable. You can see the issuer, the hash, the signature, the dependency chain. In simulated mode all these values are structurally valid but locally generated. The UI tells you that. Nothing pretends to be real when it isn't."

Close the drawer. Click "View Orders".

### 9. Orders Page (/orders)

- **Trust Mode Panel** at the top (expand it)
- Order card with vendor avatars, simulated badge, date, total

**Expand the order.** Two columns:
- **Left:** vendor sub-orders with line items and subtotals
- **Right:** Verum Claim Chain timeline

**Demo the Timeline:** Each claim in the timeline is clickable. Click one to open the inspect drawer again. Show the dependency link — the vendor.order.confirmed claim references the payment.intent hash.

**Verification Summary** below the timeline shows the check results with mode label.

**Talk track:** "The orders page is the audit view. Every claim in the chain is clickable, every dependency is traceable, and the trust mode is always visible. If this were connected to a real Verum runtime, the verification section would show cryptographic proof instead of simulated checks."

### 10. (Optional) Show Mode Switching

If time permits, show the `.env.local` file:

```bash
# Change to:
NEXT_PUBLIC_VERUM_MODE=cli
```

Restart the dev server. The navbar badge turns green "Verum CLI". The trust panel shows capabilities as "simulated" (because the binary isn't installed). Degradation warnings appear on checkout and in the inspect drawer.

**Talk track:** "The app degrades gracefully. It tells you exactly what it tried, what failed, and what fell back to simulation. No silent failures."

## Key Points to Land

1. **Cross-store shopping** — visit separate storefronts, one universal cart follows you
2. **Claim chain per vendor** — every order step is a typed, dependency-linked assertion
3. **Fully inspectable** — click any claim, see everything
4. **Trust mode transparency** — the UI never lies about what's simulated
5. **Clean separation** — UniversalCart never touches the Verum repo; the adapter boundary is the only integration point
6. **Three modes** — mock (default), CLI (opt-in), MCP (opt-in) — all from one env var

## Recommended Demo Products

These three create the best visual demo (different vendors, different categories, good price spread):

- **Nova Wireless Earbuds Pro** — Aurora Electronics — $149.99
- **Merino Wool Crewneck** — Thread & Co. — $98.00
- **Artisan Sourdough Loaf** — Green Basket — $8.50

---

# Chrome Extension Demo Script

A walkthrough for demoing the extension on real websites. Takes about 3 minutes.

## Setup

1. Open `chrome://extensions`, enable Developer mode
2. Click "Load unpacked" → select the `extension/` folder
3. Pin the UniversalCart icon in the toolbar

## The Walkthrough

### 1. Visit Amazon (or any product page)

Navigate to a product page on amazon.com.

**What to show:** The floating "Add to UniversalCart" button in the bottom-right corner. It shows the product name and price auto-detected from the page.

**Talk track:** "The extension detects the product on the page automatically — name, price, image — using the site's own structured data. No scraping, just reading what the store already publishes."

**Demo action:** Click the floating button. Note the green "Added to cart!" confirmation.

### 2. Visit Nike (or a second store)

Navigate to a product page on nike.com.

**What to show:** The badge on the toolbar icon updates. The floating button appears again with the Nike product.

**Talk track:** "Same extension, different store. The cart follows you across sites."

**Demo action:** Click the floating button to add the Nike item.

### 3. Open the Side Panel

Click the UniversalCart toolbar icon to open the side panel.

**What to show:**
- Items grouped by store with favicons and accent colors
- Per-store subtotals
- Toast message: "Added from nike.com — 2 items across 2 stores"
- Amber "Simulated" trust badge

**Talk track:** "Two stores, one cart. Each store is grouped with its own subtotal. The trust badge tells you this is simulated mode — no claims are real yet."

### 4. Promo Intelligence

Expand the **Promo Intelligence** section in the cart.

**What to show:**
- Estimated savings badge in the header (if offers were detected)
- Per-store breakdown: detected offers, confidence badges, source labels
- Any detected promo codes with copy buttons
- Signup offers marked "Requires signup" (never auto-submitted)
- Per-store code entry field
- Honesty notice at the bottom

**Demo action:** If a promo code was detected, show the copy button. If there's a code entry field, type a code and click "Add" — it appears with a "User added" badge.

**Talk track:** "The extension detects visible discounts on each store's page and builds a savings plan across your cart. Every offer shows its source — detected on page, user-added, or estimated — and its confidence level. Nothing is faked. Signup offers require your explicit action. The savings numbers are always labeled as estimates."

### 5. Checkout

Click "Checkout" to review the order.

**What to show:**
- Review page with per-store groups
- Promo Intelligence section (same offers carry through)
- Estimated savings in the footer (if applicable)
- Trust badge: "Claims will be simulated locally"

Click "Place Order."

### 6. Watch the Staggered Claim Chain

**What to show:** Claims appear one at a time with a linking animation — payment intent first, then vendor confirmation, then fulfillment, then delivery. Each one references the previous hash.

**Talk track:** "Every store gets its own claim chain. Each claim links to the one before it — a typed, dependency-linked assertion. In a production version, these would be cryptographically signed by a real Verum runtime."

### 7. Inspect a Claim

Click any claim in the confirmation screen.

**What to show:**
- Trust mode: "Simulated — locally generated, not externally verified"
- Claim type with description
- Issuer DID with copy button
- Content hash (real SHA-256 via Web Crypto — not simulated)
- Ed25519 signature (simulated)
- Dependencies — root claim has none; subsequent claims reference parent hash
- Verification status

**Talk track:** "The content hashes in the extension are real SHA-256 computed locally via Web Crypto. The signatures are simulated. The UI tells you exactly what's real and what isn't."

### 8. View Orders

Switch to the "Orders" tab. Expand an order to see the full claim chain and vendor breakdown. Click any claim to inspect again.

### 9. Export

Click "Report" in the toolbar. A self-contained HTML report downloads showing orders and claims in a human-readable format.

**Talk track:** "You can hand this to someone who doesn't have the extension. It's a standalone audit trail."

## Extension Key Points to Land

1. **Works on real websites** — auto-detects products from Amazon, Nike, Target, Shopify stores, and any site with structured data
2. **Cross-site cart** — one cart across every store you visit
3. **Promo Intelligence** — detects visible discounts, lets you add codes, builds a savings plan, never fakes or overclaims
4. **Claim chain per vendor** — every order step produces a typed, inspectable claim
5. **Real SHA-256 hashes** — extension content hashes are computed via Web Crypto, not simulated
6. **Honest labeling** — every savings estimate, confidence level, and trust mode is explicit
7. **No shady automation** — no fake codes, no silent signups, no hidden data submission
