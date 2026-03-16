// Verum claim chain generation for UniversalCart extension.
// Uses real SHA-256 (Web Crypto) for content hashes.
// Signatures and DIDs are structurally valid but locally generated (mock mode).

export const CLAIM_TYPES = {
  "payment.intent":
    "Platform captures payment intent. Root of the current commerce chain.",
  "vendor.order.confirmed":
    "Vendor accepts the order. Depends on the payment intent hash.",
  "fulfillment.acknowledged":
    "Legacy fulfillment step from the original demo chain.",
  "delivery.confirmed":
    "Legacy delivery step from the original demo chain.",
};

export async function generateDid(seed) {
  const data = new TextEncoder().encode(seed);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `did:key:z6Mk${hex.substring(0, 44)}`;
}

export async function hashContent(obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

export function generateSignature() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  return (
    "ed25519:" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function generateClaimId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return (
    "vc_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function buildClaim(type, issuer, subject, content, dependencies) {
  const id = generateClaimId();
  const issuedAt = new Date().toISOString();
  const contentHash = await hashContent({ ...content, type, issuer, issuedAt });
  const signature = generateSignature();

  return {
    id,
    type,
    issuer,
    contentHash,
    timestamp: issuedAt,
    status: "valid",
    envelope: {
      version: "ClaimEnvelopeV1",
      claimType: type,
      issuer,
      issuedAt,
      contentHash,
      dependencies,
      signature,
    },
  };
}

/**
 * Creates the current UniversalCart commerce chain for an order.
 * One chain per vendor (website): payment.intent -> vendor.order.confirmed
 */
export async function createClaimChain(order) {
  const platformDid = await generateDid("universalcart.platform");
  const claims = [];

  for (const group of order.vendorGroups) {
    const vendorDid = group.vendor.did;
    const subject = `order:${order.id}:${group.vendor.domain}`;

    const payment = await buildClaim(
      "payment.intent",
      platformDid,
      subject,
      {
        orderId: order.id,
        vendor: group.vendor.domain,
        amount: group.subtotal,
        currency: "USD",
        items: group.items.length,
      },
      []
    );

    const confirmed = await buildClaim(
      "vendor.order.confirmed",
      vendorDid,
      subject,
      {
        orderId: order.id,
        vendor: group.vendor.domain,
        itemCount: group.items.length,
        accepted: true,
      },
      [payment.contentHash]
    );

    claims.push(payment, confirmed);
  }

  return {
    mode: "mock",
    claims,
    warnings: [],
  };
}

export function inspectClaim(claim) {
  const dependencies = claim.dependencies ?? claim.envelope?.dependencies ?? [];
  const signature = claim.signature ?? claim.envelope?.signature ?? "";
  const issuedAt = claim.issuedAt ?? claim.timestamp ?? claim.envelope?.issuedAt;

  return {
    mode: "mock",
    claimType: claim.type,
    description: CLAIM_TYPES[claim.type] || "Unknown claim type",
    issuer: claim.issuer,
    contentHash: claim.contentHash,
    signature,
    dependencies,
    verificationStatus:
      claim.status === "valid" ? "valid (simulated)" : claim.status ?? "unknown",
    issuedAt,
    envelope: claim.envelope,
    warnings: [
      "Claims are generated locally — not cryptographically signed by an external Verum runtime.",
    ],
  };
}
