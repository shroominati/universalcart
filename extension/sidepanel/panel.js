import {
  getCart,
  addItem,
  removeItem,
  updateQuantity,
  getOrders,
  saveOrder,
  getAccentColor,
  getFaviconUrl,
  generateItemId,
  resetAll,
  exportData,
  exportHtmlReport,
  getPromos,
  addPromo,
  removePromo,
  getUserCodes,
  addUserCode,
  removeUserCode,
} from "../lib/store.js";
import {
  createClaimChain,
  generateDid,
  inspectClaim,
  CLAIM_TYPES,
} from "../lib/verum.js";
import {
  SOURCE,
  CONFIDENCE,
  ACTION,
  STATUS,
  SOURCE_LABELS,
  CONFIDENCE_LABELS,
  createCandidate,
  estimateSavings,
  buildPlan,
  inferCartRules,
} from "../lib/promo.js";

const app = document.getElementById("app");

// --- State ---

let currentView = "cart"; // cart | checkout | processing | confirmation | orders
let currentTab = "cart"; // cart | orders
let cartItems = [];
let orders = [];
let currentOrder = null;
let expandedClaim = null;
let expandedOrderId = null;
let detectedProduct = null;
let toastMessage = null;
let toastTimeout = null;
let revealedClaims = -1; // -1 = show all, 0+ = staggered reveal in progress
let backendStatus = null; // null | { mode, capabilities }
let promoPlan = null; // CartSavingsSummary from buildPlan()
let allPromos = []; // raw detected promo candidates
let userCodes = []; // user-added promo codes
let promoExpanded = false; // toggle promo section

// --- Icons (inline SVG) ---

const icons = {
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  chevron: `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
};

// --- Helpers ---

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function groupByVendor(items) {
  const groups = {};
  for (const item of items) {
    const vendorKey = item.vendor?.domain || item.vendor?.pageDomain || "unknown";
    if (!groups[vendorKey]) {
      groups[vendorKey] = { vendor: item.vendor, items: [], subtotal: 0 };
    }
    groups[vendorKey].items.push(item);
    groups[vendorKey].subtotal += (item.price || 0) * item.quantity;
  }
  return Object.values(groups);
}

function cartTotal(items) {
  return items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
}

function claimDotClass(type) {
  if (type.startsWith("payment")) return "payment";
  if (type.startsWith("vendor")) return "vendor";
  if (type.startsWith("fulfillment")) return "fulfillment";
  if (type.startsWith("delivery")) return "delivery";
  return "payment";
}

function claimLabel(type) {
  return type
    .split(".")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function claimDependencies(claim) {
  return claim.dependencies || claim.envelope?.dependencies || [];
}

function claimSignature(claim) {
  return claim.signature || claim.envelope?.signature || "";
}

function claimIssuedAt(claim) {
  return claim.issuedAt || claim.timestamp || claim.envelope?.issuedAt || "";
}

function getOrderTrust(order) {
  return order?.trust || {
    source: "local",
    mode: "mock",
    warnings: [],
    capabilities: null,
  };
}

function summarizeTrust(trust) {
  const normalized = {
    source: trust?.source || "local",
    mode: trust?.mode || "mock",
    warnings: trust?.warnings || [],
    capabilities: trust?.capabilities || null,
  };

  if (normalized.mode === "mock") {
    return {
      badgeClass: "simulated",
      badgeTitle:
        normalized.source === "backend"
          ? "Backend connected — mock mode"
          : "Local simulation",
      badgeDetail:
        normalized.source === "backend"
          ? "The web app backend is running in mock mode. Claims are still simulated."
          : "Claims are generated locally in mock mode.",
      claimStatus: "valid (simulated)",
      warnings: normalized.warnings,
    };
  }

  if (normalized.warnings.length > 0 || normalized.capabilities?.generateClaims === false) {
    return {
      badgeClass: "simulated",
      badgeTitle: `${String(normalized.mode).toUpperCase()} wrapper`,
      badgeDetail:
        `The backend is in ${normalized.mode} mode, but current UniversalCart commerce claims still fall back to simulated generation.`,
      claimStatus: "valid (simulated fallback)",
      warnings: normalized.warnings,
    };
  }

  return {
    badgeClass: "verified",
    badgeTitle: `${String(normalized.mode).toUpperCase()} backend`,
    badgeDetail: `Claims were created by the backend in ${normalized.mode} mode.`,
    claimStatus: "valid",
    warnings: normalized.warnings,
  };
}

function renderTrustBadge(trust) {
  const summary = summarizeTrust(trust);
  return `
    <div class="trust-badge ${summary.badgeClass}">
      ${icons.alertTriangle}
      ${esc(summary.badgeTitle)} — ${esc(summary.badgeDetail)}
    </div>
  `;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncHash(hash, len = 16) {
  if (!hash) return "—";
  if (hash.length <= len + 6) return hash;
  return hash.substring(0, len + 7) + "…" + hash.slice(-6);
}

function vendorDisplayName(vendor) {
  return vendor?.name || vendor?.domain || "unknown";
}

function vendorSourceSummary(vendor) {
  if (!vendor) return "Unknown source";
  if (vendor.pageDomain && vendor.pageDomain !== vendor.domain) {
    return `${vendorDisplayName(vendor)} via ${vendor.pageDomain}`;
  }
  return vendor.domain || vendorDisplayName(vendor);
}

function renderVendorSourceMeta(vendor) {
  if (!vendor) return "";

  const sourceBits = [];
  if (vendor.pageDomain && vendor.pageDomain !== vendor.domain) {
    sourceBits.push(`Viewed on ${vendor.pageDomain}`);
  }
  if (vendor.sourceUrl) {
    sourceBits.push("source captured");
  }

  return sourceBits.length
    ? `<div class="vendor-source">${esc(sourceBits.join(" · "))}</div>`
    : "";
}

function showToast(msg) {
  toastMessage = msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastMessage = null;
    render();
  }, 3500);
  render();
}

function renderToast() {
  if (!toastMessage) return "";
  return `<div class="toast">${icons.check} ${esc(toastMessage)}</div>`;
}

// --- Promo Intelligence ---

async function refreshPromos() {
  const rawPromos = await getPromos();
  userCodes = await getUserCodes();
  const groups = groupByVendor(cartItems);

  // Convert raw detected promos to proper candidates
  const candidates = rawPromos.map((raw) => {
    const sourceMap = {
      structured_discount: SOURCE.MERCHANT_STRUCTURED,
      visible_code: SOURCE.SITE_DETECTED,
      code_field: SOURCE.SITE_DETECTED,
      signup_offer: SOURCE.SIGNUP_OFFER,
      sale_banner: SOURCE.SITE_DETECTED,
    };
    const confMap = {
      verified: CONFIDENCE.VERIFIED,
      likely: CONFIDENCE.LIKELY,
      weak: CONFIDENCE.WEAK,
    };
    const actionMap = {
      structured_discount: ACTION.NO_ACTION,
      visible_code: raw.code ? ACTION.USER_APPLY : ACTION.NO_ACTION,
      code_field: ACTION.ADD_CODE,
      signup_offer: ACTION.OPEN_SIGNUP,
      sale_banner: ACTION.NO_ACTION,
    };
    return createCandidate({
      domain: raw.domain,
      code: raw.code || null,
      description: raw.text || "Detected offer",
      source: sourceMap[raw.type] || SOURCE.UNKNOWN,
      confidence: confMap[raw.confidence] || CONFIDENCE.WEAK,
      action: actionMap[raw.type] || ACTION.NO_ACTION,
      discountType: raw.discountType || "unknown",
      discountValue: raw.discountValue || null,
      requiresSignup: raw.requiresSignup || false,
    });
  });

  // Add user-entered codes as candidates
  for (const uc of userCodes) {
    candidates.push(
      createCandidate({
        domain: uc.domain,
        code: uc.code,
        description: uc.description || `User code: ${uc.code}`,
        source: SOURCE.USER_ADDED,
        confidence: CONFIDENCE.LIKELY,
        action: ACTION.USER_APPLY,
        discountType: "unknown",
        discountValue: null,
      })
    );
  }

  // Add inferred cart rules for domains in the cart
  for (const group of groups) {
    const domain = group.vendor?.domain || "unknown";
    const inferred = inferCartRules(domain, group.subtotal);
    candidates.push(...inferred);
  }

  allPromos = candidates;
  promoPlan = groups.length > 0 ? buildPlan(groups, candidates) : null;
}

function renderPromoSection() {
  if (!promoPlan || cartItems.length === 0) return "";

  const { totalEstimatedSavings, totalCertainSavings, totalConditionalSavings, storesWithOffers, storesNeedingAction, stores } = promoPlan;
  const hasAnything = storesWithOffers > 0 || allPromos.length > 0;

  let html = `
    <div class="promo-section">
      <div class="promo-header" data-action="toggle-promo">
        <div class="promo-header-left">
          <span class="promo-icon">${icons.tag}</span>
          <span class="promo-title">Promo Intelligence</span>
        </div>
        <div class="promo-header-right">
  `;

  if (totalEstimatedSavings > 0) {
    html += `<span class="promo-savings-badge">~$${totalEstimatedSavings.toFixed(2)} est. savings</span>`;
  } else if (hasAnything) {
    html += `<span class="promo-hint-badge">${allPromos.length} signal${allPromos.length !== 1 ? "s" : ""}</span>`;
  }

  html += `
          <span class="chevron ${promoExpanded ? "open" : ""}">${icons.chevron}</span>
        </div>
      </div>
  `;

  if (promoExpanded) {
    // Summary bar
    if (totalEstimatedSavings > 0) {
      html += `
        <div class="promo-summary">
          <div class="promo-summary-row">
            <span>Estimated savings</span>
            <strong class="promo-amount">-$${totalEstimatedSavings.toFixed(2)}</strong>
          </div>
          ${totalCertainSavings > 0 ? `<div class="promo-summary-detail"><span class="promo-certain">$${totalCertainSavings.toFixed(2)} from verified offers</span></div>` : ""}
          ${totalConditionalSavings > 0 ? `<div class="promo-summary-detail"><span class="promo-conditional">$${totalConditionalSavings.toFixed(2)} conditional</span></div>` : ""}
          ${storesNeedingAction > 0 ? `<div class="promo-summary-detail"><span class="promo-action-needed">${storesNeedingAction} store${storesNeedingAction > 1 ? "s" : ""} need action</span></div>` : ""}
        </div>
      `;
    }

    // Per-store breakdown
    for (const store of stores) {
      const hasCandidates = store.candidates.length > 0;
      html += `
        <div class="promo-store">
          <div class="promo-store-header">
            <img class="promo-store-favicon" src="${esc(store.favicon || getFaviconUrl(store.domain))}" alt="" onerror="this.style.display='none'">
            <span class="promo-store-name">${esc(store.vendorName)}</span>
            <span class="promo-store-subtotal">$${store.subtotal.toFixed(2)}</span>
          </div>
      `;

      if (store.bestCandidate && store.estimatedSavings > 0) {
        const best = store.bestCandidate;
        const sourceLabel = SOURCE_LABELS[best.source] || "Unknown";
        const confLabel = CONFIDENCE_LABELS[best.confidence] || "";
        html += `
          <div class="promo-best">
            <div class="promo-best-info">
              <span class="promo-best-desc">${esc(best.description.substring(0, 80))}</span>
              <span class="promo-badges">
                <span class="promo-badge source">${esc(sourceLabel)}</span>
                <span class="promo-badge confidence-${best.confidence}">${esc(confLabel)}</span>
              </span>
            </div>
            <span class="promo-best-savings">-$${store.estimatedSavings.toFixed(2)} est.</span>
          </div>
        `;

        if (best.code && (best.action === ACTION.USER_APPLY || best.action === ACTION.AUTO_APPLY)) {
          html += `
            <div class="promo-code-display">
              <code class="promo-code-text">${esc(best.code)}</code>
              <button class="copy-btn" data-action="copy" data-text="${esc(best.code)}">${icons.copy} copy</button>
            </div>
          `;
        }

        if (best.requiresSignup) {
          html += `
            <div class="promo-signup-notice">
              ${icons.externalLink}
              <span>Requires signup — open the store's signup page to claim this offer</span>
            </div>
          `;
        }
      }

      // Other candidates (collapsed summary)
      const others = store.candidates.filter((c) => c !== store.bestCandidate);
      if (others.length > 0) {
        html += `<div class="promo-others">${others.length} more offer${others.length > 1 ? "s" : ""} detected</div>`;
      }

      if (!hasCandidates) {
        html += `<div class="promo-none">No offers detected for this store</div>`;
      }

      // User code entry for this store
      html += `
        <div class="promo-add-code">
          <input class="promo-code-input" type="text" placeholder="Enter promo code" data-domain="${esc(store.domain)}">
          <button class="promo-add-btn" data-action="add-user-code" data-domain="${esc(store.domain)}">Add</button>
        </div>
      `;

      // Show user-added codes for this store
      const storeCodes = userCodes.filter((c) => c.domain === store.domain);
      for (const uc of storeCodes) {
        html += `
          <div class="promo-user-code">
            <code>${esc(uc.code)}</code>
            <span class="promo-badge source">User added</span>
            <button class="promo-remove-code" data-action="remove-user-code" data-code-id="${esc(uc.id)}">×</button>
          </div>
        `;
      }

      html += `</div>`;
    }

    // Honesty notice
    html += `
      <div class="promo-honesty">
        ${icons.alertTriangle}
        <span>Savings are estimated. Detected offers may have conditions not visible to the extension. User-added codes are not verified. No signup or data submission happens without your explicit action.</span>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// --- Backend Integration ---

const BACKEND_URL = "http://localhost:3000";

async function probeBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/verum`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { mode: data.providerMode || data.mode, capabilities: data.capabilities };
  } catch {
    return null;
  }
}

async function generateClaimsViaBackend(order) {
  const allClaims = [];
  const warnings = [];
  let mode = backendStatus?.mode || "mock";
  for (const group of order.vendorGroups) {
    const res = await fetch(`${BACKEND_URL}/api/verum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-order-chain",
        vendorDid: group.vendor.did,
        orderId: order.id,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    mode = data.mode || data.providerMode || mode;
    if (Array.isArray(data.warnings)) {
      warnings.push(...data.warnings);
    }
    if (data.claims) allClaims.push(...data.claims);
  }
  if (allClaims.length === 0) throw new Error("No claims returned");
  return {
    source: "backend",
    mode,
    claims: allClaims,
    warnings: [...new Set(warnings)],
    capabilities: backendStatus?.capabilities || null,
  };
}

// --- Render ---

function render() {
  let html = renderHeader();
  html += renderToast();

  if (currentTab === "cart") {
    if (currentView === "cart") html += renderCart();
    else if (currentView === "checkout") html += renderCheckout();
    else if (currentView === "processing") html += renderProcessing();
    else if (currentView === "confirmation") html += renderConfirmation();
  } else {
    html += renderOrders();
  }

  app.innerHTML = html;
  bindEvents();
}

function renderHeader() {
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);
  const hasData = cartItems.length > 0 || orders.length > 0;
  return `
    <div class="header">
      <div class="header-brand">
        <div class="header-logo">${icons.shield}</div>
        <div class="header-title">Universal<span>Cart</span></div>
      </div>
      <div class="tabs">
        <button class="tab ${currentTab === "cart" ? "active" : ""}" data-action="tab" data-tab="cart">
          Cart${count > 0 ? ` (${count})` : ""}
        </button>
        <button class="tab ${currentTab === "orders" ? "active" : ""}" data-action="tab" data-tab="orders">
          Orders
        </button>
      </div>
    </div>
    ${
      hasData
        ? `<div class="toolbar">
        ${backendStatus ? `<span class="toolbar-status connected" title="Web app backend (${backendStatus.mode} mode)">● Backend</span>` : ""}
        <button class="toolbar-btn" data-action="export-data" title="Export orders and claims as JSON">${icons.download} JSON</button>
        <button class="toolbar-btn" data-action="export-html" title="Export readable HTML report">${icons.download} Report</button>
        <button class="toolbar-btn danger" data-action="reset-demo" title="Clear all cart items and orders">${icons.refresh} Reset</button>
      </div>`
        : backendStatus
          ? `<div class="toolbar"><span class="toolbar-status connected" title="Web app backend (${backendStatus.mode} mode)">● Backend</span></div>`
          : ""
    }
  `;
}

function renderCart() {
  if (cartItems.length === 0) {
    return `
      <div class="content">
        ${detectedProduct ? renderDetectedBanner() : ""}
        <div class="empty">
          <div class="empty-icon">${icons.cart}</div>
          <h2>Your cart is empty</h2>
          <p>Visit any store on the web. Products you add from different sites all end up here.</p>
        </div>
        ${renderManualAdd()}
      </div>
    `;
  }

  const groups = groupByVendor(cartItems);
  const total = cartTotal(cartItems);

  let html = `<div class="content">`;

  if (detectedProduct) html += renderDetectedBanner();

  html += `
    ${renderTrustBadge(
      backendStatus
        ? {
            source: "backend",
            mode: backendStatus.mode,
            warnings: [],
            capabilities: backendStatus.capabilities,
          }
        : { source: "local", mode: "mock", warnings: [], capabilities: null }
    )}
  `;

  for (const group of groups) {
    const v = group.vendor;
    html += `
      <div class="vendor-group">
        <div class="vendor-header">
          <div class="vendor-accent" style="background:${esc(v.accentColor || getAccentColor(v.domain))}"></div>
          <img class="vendor-favicon" src="${esc(v.favicon || getFaviconUrl(v.domain))}" alt="" onerror="this.style.display='none'">
          <div class="vendor-title-wrap">
            <span class="vendor-name">${esc(vendorDisplayName(v))}</span>
            ${renderVendorSourceMeta(v)}
          </div>
          <span class="vendor-count">${group.items.length} item${group.items.length > 1 ? "s" : ""}</span>
        </div>
    `;

    for (const item of group.items) {
      const imgHtml = item.image
        ? `<img class="item-image" src="${esc(item.image)}" alt="" onerror="this.outerHTML='<div class=\\'item-image-placeholder\\'>📦</div>'">`
        : `<div class="item-image-placeholder">📦</div>`;

      html += `
        <div class="cart-item">
          ${imgHtml}
          <div class="item-info">
            <div class="item-name" title="${esc(item.name)}">${esc(item.name)}</div>
            <div class="item-price">$${(item.price || 0).toFixed(2)}</div>
            <div class="item-source">${esc(vendorSourceSummary(item.vendor))}</div>
            <div class="item-controls">
              <button class="qty-btn" data-action="qty" data-id="${esc(item.id)}" data-delta="-1">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" data-action="qty" data-id="${esc(item.id)}" data-delta="1">+</button>
              <button class="remove-btn" data-action="remove" data-id="${esc(item.id)}" title="Remove">${icons.trash}</button>
            </div>
          </div>
        </div>
      `;
    }

    html += `
        <div class="vendor-subtotal">
          <span>Subtotal</span>
          <strong>$${group.subtotal.toFixed(2)}</strong>
        </div>
      </div>
    `;
  }

  html += renderPromoSection();
  html += renderManualAdd();
  html += `</div>`;

  const savings = promoPlan?.totalCertainSavings || 0;
  const displayTotal = Math.max(0, total - savings);

  html += `
    <div class="cart-footer">
      <div class="cart-total">
        <span class="cart-total-label">${groups.length} store${groups.length > 1 ? "s" : ""} · ${cartItems.reduce((s, i) => s + i.quantity, 0)} items</span>
        <span class="cart-total-value">$${total.toFixed(2)}</span>
      </div>
      ${savings > 0 ? `<div class="cart-savings-row"><span>Est. promo savings</span><span class="cart-savings-value">-$${savings.toFixed(2)}</span></div>` : ""}
      <button class="checkout-btn" data-action="start-checkout">Checkout — $${displayTotal.toFixed(2)}</button>
    </div>
  `;

  return html;
}

function renderDetectedBanner() {
  if (!detectedProduct) return "";
  const p = detectedProduct;
  const priceStr = p.price != null ? `$${p.price.toFixed(2)}` : "";
  return `
      <div class="detected-banner">
        <div class="det-info">
          <div class="det-label">Product detected on this page</div>
          <div class="det-name">${esc(p.name)} ${priceStr ? `· ${priceStr}` : ""}</div>
          <div class="det-source">${esc(vendorSourceSummary(p.vendor))}</div>
        </div>
        <button class="add-detected-btn" data-action="add-detected">+ Add</button>
      </div>
  `;
}

function renderManualAdd() {
  return `
    <div class="manual-add">
      <h3>${icons.plus} Add item manually</h3>
      <div class="form-field">
        <label>Product name</label>
        <input id="manual-name" type="text" placeholder="e.g. Wireless Earbuds">
      </div>
      <div class="form-field">
        <label>Price (USD)</label>
        <input id="manual-price" type="number" step="0.01" placeholder="29.99">
      </div>
      <div class="form-field">
        <label>Store / Website</label>
        <input id="manual-store" type="text" placeholder="e.g. amazon.com">
      </div>
      <button class="checkout-btn" style="margin-top:4px" data-action="manual-add">Add to Cart</button>
    </div>
  `;
}

function renderCheckout() {
  const groups = groupByVendor(cartItems);
  const total = cartTotal(cartItems);

  let html = `
    <div class="content">
      <button class="back-link" data-action="back-to-cart">${icons.arrowLeft} Back to cart</button>
      <div class="review-header">
        <h2>Review Order</h2>
        <p>${groups.length} store${groups.length > 1 ? "s" : ""} · $${total.toFixed(2)} total</p>
      </div>
      ${renderTrustBadge(
        backendStatus
          ? {
              source: "backend",
              mode: backendStatus.mode,
              warnings: [],
              capabilities: backendStatus.capabilities,
            }
          : { source: "local", mode: "mock", warnings: [], capabilities: null }
      )}
  `;

  for (const group of groups) {
    const v = group.vendor;
    html += `
      <div class="vendor-group">
        <div class="vendor-header">
          <div class="vendor-accent" style="background:${esc(v.accentColor || getAccentColor(v.domain))}"></div>
          <img class="vendor-favicon" src="${esc(v.favicon || getFaviconUrl(v.domain))}" alt="" onerror="this.style.display='none'">
          <span class="vendor-name">${esc(v.name || v.domain)}</span>
          <strong style="font-size:12px;color:var(--text-100)">$${group.subtotal.toFixed(2)}</strong>
        </div>
    `;
    for (const item of group.items) {
      html += `
        <div class="cart-item" style="cursor:default">
          <div class="item-info">
            <div class="item-name">${esc(item.name)}</div>
            <div class="item-price">$${(item.price || 0).toFixed(2)} × ${item.quantity}</div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  html += renderPromoSection();
  html += `</div>`;

  const checkoutSavings = promoPlan?.totalCertainSavings || 0;
  const checkoutTotal = Math.max(0, total - checkoutSavings);

  html += `
    <div class="cart-footer">
      <div class="cart-total">
        <span class="cart-total-label">Total</span>
        <span class="cart-total-value">$${total.toFixed(2)}</span>
      </div>
      ${checkoutSavings > 0 ? `<div class="cart-savings-row"><span>Est. promo savings</span><span class="cart-savings-value">-$${checkoutSavings.toFixed(2)}</span></div>` : ""}
      <button class="checkout-btn" data-action="place-order">Place Order — $${checkoutTotal.toFixed(2)}</button>
    </div>
  `;

  return html;
}

function renderProcessing() {
  return `
    <div class="content">
      <div class="processing">
        <div class="spinner"></div>
        <h3>Generating claim chain…</h3>
        <p>One chain per store — payment intent followed by vendor confirmation.</p>
        <div style="margin-top:8px">
          ${renderTrustBadge(
            backendStatus
              ? {
                  source: "backend",
                  mode: backendStatus.mode,
                  warnings: [],
                  capabilities: backendStatus.capabilities,
                }
              : { source: "local", mode: "mock", warnings: [], capabilities: null }
          )}
        </div>
      </div>
    </div>
  `;
}

function renderConfirmation() {
  if (!currentOrder) return "";
  const isRevealing = revealedClaims >= 0;
  const visibleClaims = isRevealing
    ? currentOrder.claims.slice(0, revealedClaims)
    : currentOrder.claims;

  let html = `
    <div class="content">
      <div class="confirm-success">
        <div class="success-icon">${icons.check}</div>
        <h2>Order Complete</h2>
        <div class="order-id">${esc(currentOrder.id)}</div>
        <div class="order-total">$${currentOrder.total.toFixed(2)}</div>
      </div>
      ${renderTrustBadge(getOrderTrust(currentOrder))}
  `;

  html += renderClaimChain(visibleClaims, getOrderTrust(currentOrder));

  if (isRevealing) {
    html += `<div class="generating-hint">Generating claim ${revealedClaims + 1} of ${currentOrder.claims.length}…</div>`;
  } else {
    html += `
      <div class="btn-row">
        <button class="btn-secondary" data-action="new-cart">New Cart</button>
        <button class="btn-secondary" data-action="view-orders">View Orders</button>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

function renderClaimChain(claims, trust) {
  if (!claims || claims.length === 0) return "";
  const trustSummary = summarizeTrust(trust);

  let html = `
    <div class="claims-section">
      <div class="claims-title">Verum Claim Chain (${claims.length} claims)</div>
      <div class="claim-timeline">
  `;

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const isLast = i === claims.length - 1;
    const isExpanded = expandedClaim === claim.id;

    html += `
      <div class="claim-row" data-action="toggle-claim" data-claim-idx="${i}">
        <div class="claim-dot-col">
          <div class="claim-dot ${claimDotClass(claim.type)}"></div>
          ${!isLast ? '<div class="claim-line"></div>' : ""}
        </div>
        <div class="claim-info">
          <div class="claim-type">${claimLabel(claim.type)}</div>
          <div class="claim-issuer">${truncHash(claim.issuer)}</div>
          <div class="claim-status">✓ ${esc(trustSummary.claimStatus)}</div>
        </div>
      </div>
    `;

    if (isExpanded) {
      const info = inspectClaim(claim);
      const detailWarnings = [...new Set([...(info.warnings || []), ...trustSummary.warnings])];
      const dependencies = claimDependencies(claim);
      const signature = claimSignature(claim);
      html += `
        <div class="claim-detail">
          <div class="detail-row">
            <span class="detail-label">Trust Mode</span>
            <span class="detail-value warning">${esc(`${trustSummary.badgeTitle} — ${trustSummary.badgeDetail}`)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Type</span>
            <span class="detail-value">${esc(claim.type)}</span>
            <span style="font-size:10px;color:var(--text-500);margin-top:2px">${esc(info.description)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Issuer DID</span>
            <span class="detail-value">${esc(claim.issuer)} <button class="copy-btn" data-action="copy" data-text="${esc(claim.issuer)}">${icons.copy} copy</button></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Content Hash (SHA-256)</span>
            <span class="detail-value">${esc(claim.contentHash)} <button class="copy-btn" data-action="copy" data-text="${esc(claim.contentHash)}">${icons.copy} copy</button></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Signature (Ed25519)</span>
            <span class="detail-value">${truncHash(signature, 24)} <button class="copy-btn" data-action="copy" data-text="${esc(signature)}">${icons.copy} copy</button></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Dependencies</span>
            ${
              dependencies.length === 0
                ? '<span class="detail-value" style="color:var(--text-500)">None — root claim</span>'
                : `<div class="detail-deps">${dependencies.map((d) => `<div class="dep-hash">${esc(d)}</div>`).join("")}</div>`
            }
          </div>
          <div class="detail-row">
            <span class="detail-label">Verification</span>
            <span class="detail-value status">${esc(trustSummary.claimStatus)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Issued</span>
            <span class="detail-value">${formatDate(claimIssuedAt(claim))}</span>
          </div>
          ${detailWarnings.map((w) => `<div class="detail-row"><span class="detail-label">Warning</span><span class="detail-value warning">${esc(w)}</span></div>`).join("")}
        </div>
      `;
    }
  }

  html += `</div></div>`;
  return html;
}

function renderOrders() {
  if (orders.length === 0) {
    return `
      <div class="content">
        <div class="empty">
          <div class="empty-icon">${icons.package}</div>
          <h2>No orders yet</h2>
          <p>Check out from your cart to see orders and their full claim chains here.</p>
        </div>
      </div>
    `;
  }

  let html = `<div class="content">`;

  for (const order of orders) {
    const isExpanded = expandedOrderId === order.id;
    const vendorDomains = [
      ...new Set(order.vendorGroups.map((g) => g.vendor.domain)),
    ];

    html += `
      <div class="order-card">
        <div class="order-header" data-action="toggle-order" data-order-id="${esc(order.id)}">
          <div class="order-meta">
            <span class="order-meta-id">${esc(order.id)}</span>
            <span class="order-meta-date">${formatDate(order.createdAt)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="order-meta-total">$${order.total.toFixed(2)}</span>
            <span class="chevron ${isExpanded ? "open" : ""}">${icons.chevron}</span>
          </div>
        </div>
    `;

    if (isExpanded) {
      const trust = getOrderTrust(order);
      html += `
        <div class="order-body">
          <div class="order-vendors">
            ${vendorDomains
              .map((d) => {
                const v = order.vendorGroups.find(
                  (g) => g.vendor.domain === d
                )?.vendor;
                return `<span class="order-vendor-pill"><img src="${esc(v?.favicon || getFaviconUrl(d))}" alt="" onerror="this.style.display='none'">${esc(v?.name || d)}</span>`;
              })
              .join("")}
          </div>
          ${renderTrustBadge(trust)}
          ${renderClaimChain(order.claims, trust)}
        </div>
      `;
    }

    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// --- Event Handling ---

function bindEvents() {
  app.addEventListener("click", handleClick);
}

async function handleClick(e) {
  const target = e.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  if (action === "tab") {
    currentTab = target.dataset.tab;
    currentView = "cart";
    expandedClaim = null;
    expandedOrderId = null;
    if (currentTab === "orders") {
      orders = await getOrders();
    }
    render();
    return;
  }

  if (action === "qty") {
    await updateQuantity(target.dataset.id, parseInt(target.dataset.delta));
    cartItems = await getCart();
    render();
    return;
  }

  if (action === "remove") {
    await removeItem(target.dataset.id);
    cartItems = await getCart();
    render();
    return;
  }

  if (action === "start-checkout") {
    currentView = "checkout";
    render();
    return;
  }

  if (action === "back-to-cart") {
    currentView = "cart";
    render();
    return;
  }

  if (action === "place-order") {
    currentView = "processing";
    render();

    const orderId = `UC-${Date.now().toString(36).toUpperCase()}`;
    const total = cartTotal(cartItems);
    const vendorGroups = groupByVendor(cartItems);

    for (const group of vendorGroups) {
      group.vendor.did = await generateDid(group.vendor.domain);
    }

    const order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      items: [...cartItems],
      vendorGroups,
      total,
    };

    // If web app backend is running, use it for claim generation
    let claimResult;
    if (backendStatus) {
      try {
        claimResult = await generateClaimsViaBackend(order);
      } catch {
        claimResult = await createClaimChain(order);
        claimResult.warnings = [
          "Web app backend was unavailable during checkout. Using local simulation.",
        ];
      }
    } else {
      claimResult = await createClaimChain(order);
    }
    order.claims = claimResult.claims;
    order.trust = {
      source: claimResult.source || "local",
      mode: claimResult.mode || "mock",
      warnings: claimResult.warnings || [],
      capabilities: claimResult.capabilities || null,
    };

    await saveOrder(order);
    currentOrder = order;
    cartItems = [];
    currentView = "confirmation";
    revealedClaims = 0;

    // Brief delay before starting the reveal
    setTimeout(() => {
      render();
      // Reveal claims one at a time
      const revealInterval = setInterval(() => {
        revealedClaims++;
        render();
        if (revealedClaims >= (currentOrder?.claims?.length || 0)) {
          clearInterval(revealInterval);
          revealedClaims = -1; // show all + enable buttons
          setTimeout(() => render(), 200);
        }
      }, 400);
    }, 800);
    return;
  }

  if (action === "toggle-claim") {
    const idx = parseInt(target.dataset.claimIdx);
    const claims = currentOrder?.claims || getExpandedOrderClaims();
    if (claims && claims[idx]) {
      expandedClaim = expandedClaim === claims[idx].id ? null : claims[idx].id;
      render();
    }
    return;
  }

  if (action === "toggle-order") {
    const id = target.dataset.orderId;
    expandedOrderId = expandedOrderId === id ? null : id;
    expandedClaim = null;
    render();
    return;
  }

  if (action === "copy") {
    const text = target.dataset.text;
    try {
      await navigator.clipboard.writeText(text);
      target.innerHTML = `${icons.check} copied`;
      setTimeout(() => {
        target.innerHTML = `${icons.copy} copy`;
      }, 1500);
    } catch {
      // Clipboard not available
    }
    return;
  }

  if (action === "new-cart") {
    currentOrder = null;
    currentView = "cart";
    expandedClaim = null;
    render();
    return;
  }

  if (action === "view-orders") {
    currentOrder = null;
    currentTab = "orders";
    currentView = "cart";
    expandedClaim = null;
    orders = await getOrders();
    render();
    return;
  }

  if (action === "add-detected") {
    if (detectedProduct) {
      const vendor = detectedProduct.vendor || {
        name: "Unknown",
        domain: "unknown",
      };
      const item = {
        id: generateItemId(vendor.domain, detectedProduct.name, {
          price: detectedProduct.price,
          image: detectedProduct.image,
          sourceUrl: vendor.sourceUrl || detectedProduct.url,
          pageDomain: vendor.pageDomain,
        }),
        name: detectedProduct.name,
        price: detectedProduct.price || 0,
        image: detectedProduct.image || "",
        quantity: 1,
        url: detectedProduct.url || "",
        vendor,
      };
      await addItem(item);
      detectedProduct = null;
      cartItems = await getCart();
      render();
    }
    return;
  }

  if (action === "reset-demo") {
    if (
      confirm(
        "Clear all cart items and orders? This resets the extension to a clean state for a fresh demo."
      )
    ) {
      await resetAll();
      cartItems = [];
      orders = [];
      currentOrder = null;
      expandedClaim = null;
      expandedOrderId = null;
      currentView = "cart";
      currentTab = "cart";
      detectedProduct = null;
      render();
      try {
        chrome.runtime.sendMessage({ type: "BADGE_UPDATE" });
      } catch {
        // background may not respond
      }
    }
    return;
  }

  if (action === "export-data") {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `universalcart-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download not supported in this context
    }
    return;
  }

  if (action === "export-html") {
    try {
      const html = await exportHtmlReport();
      if (!html) {
        showToast("No orders to export");
        return;
      }
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `universalcart-report-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Download not supported
    }
    return;
  }

  if (action === "toggle-promo") {
    promoExpanded = !promoExpanded;
    render();
    return;
  }

  if (action === "add-user-code") {
    const domain = target.dataset.domain;
    const input = document.querySelector(`.promo-code-input[data-domain="${domain}"]`);
    const code = input?.value?.trim();
    if (!code) {
      input?.focus();
      return;
    }
    await addUserCode(domain, code);
    await refreshPromos();
    showToast(`Code "${code}" added for ${domain}`);
    return;
  }

  if (action === "remove-user-code") {
    await removeUserCode(target.dataset.codeId);
    await refreshPromos();
    render();
    return;
  }

  if (action === "manual-add") {
    const nameEl = document.getElementById("manual-name");
    const priceEl = document.getElementById("manual-price");
    const storeEl = document.getElementById("manual-store");
    const name = nameEl?.value?.trim();
    const price = parseFloat(priceEl?.value) || 0;
    const store = storeEl?.value?.trim() || "manual-entry";

    if (!name) {
      nameEl?.focus();
      return;
    }

    const domain = store
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];

    const item = {
      id: generateItemId(domain, name),
      name,
      price,
      image: "",
      quantity: 1,
      url: "",
      vendor: {
        name: store,
        domain,
        favicon: getFaviconUrl(domain),
        accentColor: getAccentColor(domain),
        did: "",
      },
    };

    await addItem(item);
    cartItems = await getCart();
    render();
    return;
  }
}

function getExpandedOrderClaims() {
  if (!expandedOrderId) return null;
  const order = orders.find((o) => o.id === expandedOrderId);
  return order?.claims || null;
}

// --- Live Updates ---

chrome.storage.onChanged.addListener(async (changes, namespace) => {
  if (namespace !== "local") return;
  if (changes.uc_cart) {
    const oldCart = changes.uc_cart.oldValue || [];
    const newCart = changes.uc_cart.newValue || [];
    cartItems = newCart;

    // Recompute promo plan when cart changes
    await refreshPromos();

    if (newCart.length > oldCart.length) {
      const newItem = newCart.find(
        (item) => !oldCart.some((old) => old.id === item.id)
      );
      if (newItem) {
        const storeCount = new Set(newCart.map((i) => i.vendor?.domain)).size;
        const totalItems = newCart.reduce((s, i) => s + i.quantity, 0);
        const source = vendorSourceSummary(newItem.vendor);
        showToast(
          `Added from ${source} — ${totalItems} item${totalItems !== 1 ? "s" : ""} across ${storeCount} store${storeCount !== 1 ? "s" : ""}`
        );
        return;
      }
    }

    if (currentView === "cart") render();
  }
  if (changes.uc_promos || changes.uc_user_codes) {
    await refreshPromos();
    if (currentView === "cart" || currentView === "checkout") render();
  }
});

// Listen for product detection from content scripts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PRODUCT_DETECTED" && currentTab === "cart") {
    detectedProduct = message.product;
    render();
  }
});

// --- Init ---

async function init() {
  cartItems = await getCart();
  orders = await getOrders();
  backendStatus = await probeBackend();
  await refreshPromos();
  render();

  // Re-probe periodically (every 30s)
  setInterval(async () => {
    const prev = backendStatus;
    backendStatus = await probeBackend();
    if (!!prev !== !!backendStatus) render();
  }, 30000);
}

init();
