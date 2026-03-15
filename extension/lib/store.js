// Chrome Storage based state management for UniversalCart extension.

const CART_KEY = "uc_cart";
const ORDERS_KEY = "uc_orders";
const PROMOS_KEY = "uc_promos";
const USER_CODES_KEY = "uc_user_codes";

export async function getCart() {
  const result = await chrome.storage.local.get(CART_KEY);
  return result[CART_KEY] || [];
}

export async function setCart(cart) {
  await chrome.storage.local.set({ [CART_KEY]: cart });
}

export async function addItem(item) {
  const cart = await getCart();
  const existing = cart.find((i) => i.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  await setCart(cart);
  return cart;
}

export async function removeItem(itemId) {
  const cart = await getCart();
  const filtered = cart.filter((i) => i.id !== itemId);
  await setCart(filtered);
  return filtered;
}

export async function updateQuantity(itemId, delta) {
  const cart = await getCart();
  const item = cart.find((i) => i.id === itemId);
  if (!item) return cart;
  item.quantity = Math.max(1, item.quantity + delta);
  await setCart(cart);
  return cart;
}

export async function clearCart() {
  await setCart([]);
}

export async function getOrders() {
  const result = await chrome.storage.local.get(ORDERS_KEY);
  return result[ORDERS_KEY] || [];
}

export async function saveOrder(order) {
  const orders = await getOrders();
  orders.unshift(order);
  await chrome.storage.local.set({ [ORDERS_KEY]: orders });
  await clearCart();
  return orders;
}

export async function getCartCount() {
  const cart = await getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

export async function resetAll() {
  await chrome.storage.local.remove([CART_KEY, ORDERS_KEY, PROMOS_KEY, USER_CODES_KEY]);
}

// --- Promo Storage ---

export async function getPromos() {
  const result = await chrome.storage.local.get(PROMOS_KEY);
  return result[PROMOS_KEY] || [];
}

export async function addPromo(promo) {
  const promos = await getPromos();
  const exists = promos.some(
    (p) => p.domain === promo.domain && p.description === promo.description
  );
  if (!exists) {
    promos.push(promo);
    await chrome.storage.local.set({ [PROMOS_KEY]: promos });
  }
  return promos;
}

export async function addPromos(newPromos) {
  const promos = await getPromos();
  let added = 0;
  for (const p of newPromos) {
    const exists = promos.some(
      (e) => e.domain === p.domain && e.description === p.description
    );
    if (!exists) {
      promos.push(p);
      added++;
    }
  }
  if (added > 0) {
    await chrome.storage.local.set({ [PROMOS_KEY]: promos });
  }
  return promos;
}

export async function removePromo(promoId) {
  const promos = await getPromos();
  const filtered = promos.filter((p) => p.id !== promoId);
  await chrome.storage.local.set({ [PROMOS_KEY]: filtered });
  return filtered;
}

export async function getUserCodes() {
  const result = await chrome.storage.local.get(USER_CODES_KEY);
  return result[USER_CODES_KEY] || [];
}

export async function addUserCode(domain, code, description = "") {
  const codes = await getUserCodes();
  codes.push({
    id: `ucode_${Date.now()}`,
    domain,
    code,
    description: description || `User code: ${code}`,
    addedAt: new Date().toISOString(),
  });
  await chrome.storage.local.set({ [USER_CODES_KEY]: codes });
  return codes;
}

export async function removeUserCode(codeId) {
  const codes = await getUserCodes();
  const filtered = codes.filter((c) => c.id !== codeId);
  await chrome.storage.local.set({ [USER_CODES_KEY]: filtered });
  return filtered;
}

export async function exportData() {
  const cart = await getCart();
  const orders = await getOrders();
  return {
    exportedAt: new Date().toISOString(),
    extension: "UniversalCart",
    version: "0.1.0",
    trustMode: "simulated",
    cart,
    orders,
  };
}

export async function exportHtmlReport() {
  const orders = await getOrders();
  if (orders.length === 0) return null;

  const claimColors = {
    "payment.intent": "#6366f1",
    "vendor.order.confirmed": "#ec4899",
    "fulfillment.acknowledged": "#fbbf24",
    "delivery.confirmed": "#34d399",
  };

  function claimLabel(type) {
    return type.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  let ordersHtml = "";
  for (const order of orders) {
    const vendors = [...new Set(order.vendorGroups.map(g => g.vendor?.name || g.vendor?.domain))];
    let claimsHtml = "";
    for (const claim of (order.claims || [])) {
      const color = claimColors[claim.type] || "#818cf8";
      const deps = claim.dependencies.length === 0
        ? "<em>None — root claim</em>"
        : claim.dependencies.map(d => `<code>${d}</code>`).join("<br>");
      claimsHtml += `
        <div style="border-left:3px solid ${color};padding:10px 14px;margin:8px 0;background:#1a1a1f;border-radius:0 8px 8px 0">
          <div style="font-weight:700;color:${color};font-size:13px">${claimLabel(claim.type)}</div>
          <table style="width:100%;margin-top:6px;font-size:11px;border-collapse:collapse">
            <tr><td style="color:#71717a;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">Issuer</td><td style="color:#d4d4d8;padding:3px 0;word-break:break-all"><code>${claim.issuer}</code></td></tr>
            <tr><td style="color:#71717a;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">Content Hash</td><td style="color:#d4d4d8;padding:3px 0;word-break:break-all"><code>${claim.contentHash}</code></td></tr>
            <tr><td style="color:#71717a;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">Signature</td><td style="color:#d4d4d8;padding:3px 0;word-break:break-all"><code>${claim.signature.substring(0, 40)}…</code></td></tr>
            <tr><td style="color:#71717a;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">Dependencies</td><td style="color:#a1a1aa;padding:3px 0;word-break:break-all">${deps}</td></tr>
            <tr><td style="color:#71717a;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">Status</td><td style="color:#34d399;padding:3px 0">✓ valid (simulated)</td></tr>
          </table>
        </div>`;
    }

    let itemsHtml = "";
    for (const group of order.vendorGroups) {
      itemsHtml += `<div style="margin:8px 0"><strong style="color:#a1a1aa;font-size:11px">${group.vendor?.name || group.vendor?.domain}</strong>`;
      for (const item of group.items) {
        itemsHtml += `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span style="color:#d4d4d8">${item.name}</span><span style="color:#818cf8;font-weight:600">$${(item.price * item.quantity).toFixed(2)}</span></div>`;
      }
      itemsHtml += `</div>`;
    }

    ordersHtml += `
      <div style="border:1px solid #27272a;border-radius:12px;overflow:hidden;margin:16px 0">
        <div style="padding:14px 18px;background:#18181b;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:700;color:#fafafa;font-size:14px">${order.id}</div>
            <div style="font-size:11px;color:#71717a;margin-top:2px">${new Date(order.createdAt).toLocaleString()} · ${vendors.join(", ")}</div>
          </div>
          <div style="font-size:18px;font-weight:800;color:#fafafa">$${order.total.toFixed(2)}</div>
        </div>
        <div style="padding:14px 18px">${itemsHtml}</div>
        <div style="padding:0 18px 18px">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;margin-bottom:6px">Verum Claim Chain (${(order.claims || []).length} claims)</div>
          ${claimsHtml}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UniversalCart — Order Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#09090b;color:#d4d4d8;padding:24px;max-width:720px;margin:0 auto}
  code{font-family:"SF Mono",Monaco,Consolas,monospace;font-size:10px;background:#27272a;padding:1px 4px;border-radius:3px}
  a{color:#818cf8}
</style></head><body>
<div style="text-align:center;padding:24px 0 20px">
  <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px">
    <div style="width:32px;height:32px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    </div>
    <span style="font-size:18px;font-weight:800;color:#fafafa">Universal<span style="color:#818cf8">Cart</span></span>
  </div>
  <div style="font-size:12px;color:#71717a">Order Report · Generated ${new Date().toLocaleString()}</div>
  <div style="display:inline-block;margin-top:8px;padding:4px 10px;background:rgba(251,191,36,0.1);border-radius:6px;font-size:10px;font-weight:600;color:#fbbf24;text-transform:uppercase">Simulated — claims generated locally</div>
</div>
${ordersHtml}
<div style="text-align:center;padding:24px 0;font-size:10px;color:#3f3f46">
  UniversalCart · Claim architecture powered by Verum Protocol · <a href="https://github.com">github.com/universalcart</a>
</div>
</body></html>`;
}

export function getAccentColor(domain) {
  let hash = 0;
  for (const char of domain) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 60%)`;
}

export function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export function generateItemId(domain, productName) {
  let hash = 0;
  const str = `${domain}::${productName}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `item_${Math.abs(hash).toString(36)}`;
}
