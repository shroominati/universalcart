# UniversalCart Chrome Extension

A browser extension that adds a universal shopping cart across any website. Visit different online stores, add products to one cart, check out once — with a Verum claim chain for every transaction step.

## Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder from this repo
5. The UniversalCart icon appears in your toolbar

## How It Works

### Product Detection

When you visit a product page, the extension attempts to detect the product using (in order):

1. **Site-specific adapters** — targeted DOM selectors for Amazon, Target, Nike, Walmart, Best Buy, Etsy
2. **Shopify adapter** — detects Shopify stores by CDN markers, reads product title/price/image
3. **JSON-LD Schema.org** — structured product data (`@type: "Product"`)
4. **Open Graph meta tags** — `og:title`, `product:price:amount`, `og:image`
5. **DOM heuristics** — h1 elements, price patterns, common class names

If a product is detected, a floating "Add to UniversalCart" button appears in the bottom-right corner.

### Side Panel

Click the extension icon to open the side panel. It stays open as you browse:

- **Cart tab** — items grouped by store/website, quantity controls, per-store subtotals
- **Promo Intelligence** — collapsible section showing detected discounts, savings plan, code entry, and signup offers per store (all labeled with source and confidence)
- **Manual add** — form to add items when auto-detection doesn't work
- **Checkout** — review with promo summary, staggered claim chain generation (claims appear one at a time)
- **Orders tab** — past orders with expandable Verum claim chains
- **Export** — JSON export and HTML report (self-contained, shareable)
- **Backend indicator** — green dot when local web app is running and available as a claim generation backend

### Claim Chain

When you check out, the extension generates a Verum claim chain for each vendor (website):

```
payment.intent → vendor.order.confirmed → fulfillment.acknowledged → delivery.confirmed
```

Each claim has:
- **Issuer DID** — generated deterministically from the website domain
- **Content hash** — real SHA-256 via Web Crypto API
- **Signature** — simulated Ed25519 (structurally valid, locally generated)
- **Dependencies** — each claim references the hash of its predecessor

Click any claim in the timeline to inspect its full details.

### Trust Mode

The extension currently runs in **simulated (mock) mode**. All claims are generated locally using Verum-compatible data shapes. The UI labels everything as "Simulated" — nothing pretends to be cryptographically verified when it isn't.

## Demo Walkthrough

1. Load the extension (see Install above)
2. Go to any product page — e.g. Amazon, Nike, a Shopify store
3. The floating button appears: **"Add to UniversalCart"** — click it
4. Navigate to a different store's product page — add another item
5. Click the extension icon to open the side panel
6. Two stores, one cart — see items grouped by website
7. Click **Checkout** → **Place Order**
8. Watch the claim chain generate — one chain per vendor
9. Click any claim to inspect: issuer DID, content hash, signature, dependencies
10. Switch to the **Orders** tab to see your history with full claim chains

### Promo Intelligence

The extension detects visible discounts on pages you visit:

- **Promo codes** — visible "use code X" or "apply X" text in banners
- **Coupon fields** — detects that a store accepts promo codes at checkout
- **Signup offers** — "sign up for X% off" banners (requires explicit user action to claim)
- **Sale banners** — visible "% off", "save $X", "free shipping" text
- **Structured data** — JSON-LD Offer discounts

Every detected offer shows:
- **Source** — Detected on page, From page data, User added, Estimated, Requires signup
- **Confidence** — Verified, Likely, Weak
- **Action** — auto-applicable, user-apply, open signup, add code manually

Savings are always labeled as **estimates**. No fake code generation. No silent signups. No hidden data submission.

### Sites with Good Detection

Product detection works well on:
- Amazon, Target, Walmart, Best Buy (site-specific adapters + JSON-LD)
- Nike, Etsy (site-specific adapters + OG tags)
- Most Shopify stores (Shopify adapter + JSON-LD)
- Most major retailers with structured data

For sites without structured data, use the **Manual Add** form in the side panel.

## Architecture

```
extension/
├── manifest.json           # Manifest V3
├── background.js           # Service worker — context menu, badge flash, side panel, promo relay
├── content.js              # Content script — product + promo detection, floating button (Shadow DOM)
├── sidepanel/
│   ├── index.html          # Side panel shell
│   ├── panel.js            # Cart, promo intelligence, checkout, orders, claim visualization
│   └── panel.css           # Dark theme UI
├── lib/
│   ├── verum.js            # Claim chain generation (SHA-256 via Web Crypto)
│   ├── store.js            # State management (Chrome Storage API) + promo storage + HTML export
│   └── promo.js            # Promo Intelligence model — sources, confidence, actions, planning
├── icons/                  # Extension icons (generated)
└── scripts/
    └── generate-icons.js   # Icon generation script
```

## Notes

- No build step needed — plain JS modules, loads directly in Chrome
- State persists across tabs and sessions via `chrome.storage.local`
- Content script uses Shadow DOM to avoid CSS conflicts with host pages
- Side panel uses the Chrome Side Panel API (Chrome 114+)
- All Verum claims use real SHA-256 hashes (Web Crypto API)
- Signatures and DIDs are structurally valid but locally generated
- Promo savings are always labeled as estimates — no overclaiming
- If the web app is running at localhost:3000, the extension uses it as a claim generation backend
- Toast notifications appear when items are added cross-site; badge flashes green briefly
