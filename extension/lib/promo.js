// Promo Intelligence model + planning for UniversalCart.
// Honest, bounded, local-first. No fake codes, no silent signups.

export const SOURCE = {
  SITE_DETECTED: "site_detected",
  MERCHANT_STRUCTURED: "merchant_structured",
  USER_ADDED: "user_added",
  CART_RULE_INFERRED: "cart_rule_inferred",
  SIGNUP_OFFER: "signup_offer",
  BACKEND_SUGGESTED: "backend_suggested",
  UNKNOWN: "unknown",
};

export const CONFIDENCE = {
  VERIFIED: "verified",
  LIKELY: "likely",
  WEAK: "weak",
};

export const ACTION = {
  AUTO_APPLY: "auto_apply",
  USER_APPLY: "user_apply",
  OPEN_SIGNUP: "open_signup",
  ADD_CODE: "add_code_manually",
  NO_ACTION: "no_action",
};

export const STATUS = {
  APPLIED: "applied",
  SUGGESTED: "suggested",
  REQUIRES_USER: "requires_user_action",
  UNAVAILABLE: "unavailable",
};

export const SOURCE_LABELS = {
  [SOURCE.SITE_DETECTED]: "Detected on page",
  [SOURCE.MERCHANT_STRUCTURED]: "From page data",
  [SOURCE.USER_ADDED]: "User added",
  [SOURCE.CART_RULE_INFERRED]: "Estimated",
  [SOURCE.SIGNUP_OFFER]: "Requires signup",
  [SOURCE.BACKEND_SUGGESTED]: "Suggested",
  [SOURCE.UNKNOWN]: "Needs confirmation",
};

export const CONFIDENCE_LABELS = {
  [CONFIDENCE.VERIFIED]: "Verified",
  [CONFIDENCE.LIKELY]: "Likely",
  [CONFIDENCE.WEAK]: "Weak",
};

/**
 * Create a PromoCandidate with required fields.
 */
export function createCandidate({
  domain,
  code = null,
  description,
  source,
  confidence,
  action,
  discountType = "unknown",
  discountValue = null,
  stackable = false,
  requiresSignup = false,
  expiresAt = null,
  minSpend = null,
}) {
  return {
    id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    domain,
    code,
    description,
    source,
    confidence,
    action,
    discountType, // percentage | fixed | free_shipping | unknown
    discountValue,
    stackable,
    requiresSignup,
    expiresAt,
    minSpend,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Compute savings estimate for a single candidate against a subtotal.
 */
export function estimateSavings(candidate, subtotal) {
  if (!candidate.discountValue || subtotal <= 0) return 0;
  if (candidate.minSpend && subtotal < candidate.minSpend) return 0;

  switch (candidate.discountType) {
    case "percentage":
      return Math.round(subtotal * (candidate.discountValue / 100) * 100) / 100;
    case "fixed":
      return Math.min(candidate.discountValue, subtotal);
    case "free_shipping":
      return 0; // can't estimate shipping cost
    default:
      return 0;
  }
}

/**
 * Pick the best non-conflicting candidate for a store.
 * Prefers: highest savings > higher confidence > auto-applicable.
 */
function pickBest(candidates, subtotal) {
  if (candidates.length === 0) return null;
  return candidates
    .map((c) => ({ c, savings: estimateSavings(c, subtotal) }))
    .sort((a, b) => {
      if (b.savings !== a.savings) return b.savings - a.savings;
      const confOrder = { verified: 3, likely: 2, weak: 1 };
      const ca = confOrder[a.c.confidence] || 0;
      const cb = confOrder[b.c.confidence] || 0;
      if (cb !== ca) return cb - ca;
      if (a.c.action === ACTION.AUTO_APPLY) return -1;
      if (b.c.action === ACTION.AUTO_APPLY) return 1;
      return 0;
    })[0].c;
}

/**
 * Build a full discount plan for the cart.
 * Takes cart items (grouped by vendor) and all known promo candidates.
 * Returns a CartSavingsSummary.
 */
export function buildPlan(vendorGroups, allCandidates) {
  const stores = [];
  let totalEstimated = 0;
  let totalCertain = 0;
  let totalConditional = 0;
  let storesWithOffers = 0;
  let storesNeedingAction = 0;
  let storesUnresolved = 0;

  for (const group of vendorGroups) {
    const domain = group.vendor?.domain || "unknown";
    const subtotal = group.subtotal || group.items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
    const candidates = allCandidates.filter((c) => c.domain === domain);
    const best = pickBest(candidates, subtotal);
    const savings = best ? estimateSavings(best, subtotal) : 0;

    let status = STATUS.UNAVAILABLE;
    let certain = 0;
    let conditional = 0;

    if (best) {
      storesWithOffers++;
      if (best.action === ACTION.AUTO_APPLY && best.confidence === CONFIDENCE.VERIFIED) {
        status = STATUS.APPLIED;
        certain = savings;
      } else if (best.action === ACTION.USER_APPLY || best.action === ACTION.ADD_CODE) {
        status = STATUS.SUGGESTED;
        conditional = savings;
        storesNeedingAction++;
      } else if (best.action === ACTION.OPEN_SIGNUP) {
        status = STATUS.REQUIRES_USER;
        conditional = savings;
        storesNeedingAction++;
      } else {
        status = STATUS.SUGGESTED;
        conditional = savings;
      }
    } else {
      storesUnresolved++;
    }

    totalEstimated += savings;
    totalCertain += certain;
    totalConditional += conditional;

    stores.push({
      domain,
      vendorName: group.vendor?.name || domain,
      favicon: group.vendor?.favicon || "",
      subtotal,
      bestCandidate: best,
      candidates,
      estimatedSavings: savings,
      certainSavings: certain,
      conditionalSavings: conditional,
      status,
    });
  }

  return {
    totalEstimatedSavings: totalEstimated,
    totalCertainSavings: totalCertain,
    totalConditionalSavings: totalConditional,
    storesWithOffers,
    storesNeedingAction,
    storesUnresolved,
    stores,
  };
}

/**
 * Infer cart-rule promos (e.g., free shipping over $X).
 * These are common patterns many stores share.
 */
export function inferCartRules(domain, subtotal) {
  const inferred = [];
  // Common pattern: free shipping over $35-50
  if (subtotal >= 35) {
    inferred.push(
      createCandidate({
        domain,
        description: "Free shipping may apply (orders over $35 common threshold)",
        source: SOURCE.CART_RULE_INFERRED,
        confidence: CONFIDENCE.WEAK,
        action: ACTION.NO_ACTION,
        discountType: "free_shipping",
        discountValue: null,
      })
    );
  }
  return inferred;
}
