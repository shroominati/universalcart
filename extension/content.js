// Content script: product detection + floating "Add to UniversalCart" button.
// Uses Shadow DOM to isolate styles from the host page.

(function () {
  "use strict";

  // Don't run on extension pages or chrome internals
  if (
    location.protocol === "chrome-extension:" ||
    location.protocol === "chrome:" ||
    location.hostname === "localhost"
  )
    return;

  const BLOCKED_PRODUCT_NAMES = new Set([
    "Accessibility Links",
    "Google Shopping",
    "Google Search",
    "Search",
    "Shopping",
    "Images",
    "Videos",
    "Maps",
    "News",
    "Sign in",
  ]);

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  function parsePrice(value) {
    const cleaned = cleanText(value);
    if (!cleaned) return null;
    const match = cleaned.match(/\$[\s]*([0-9]{1,5}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/);
    if (!match) return null;
    return parseFloat(match[1].replace(/,/g, ""));
  }

  function isLikelyProductName(value) {
    const text = cleanText(value);
    if (!text || text.length < 4 || text.length > 160) return false;
    if (BLOCKED_PRODUCT_NAMES.has(text)) return false;
    if (/^(home|menu|filters?|nearby|deals?|stores?)$/i.test(text)) return false;
    if (/^(add to cart|track price|typically \$)/i.test(text)) return false;
    if (!/[a-z]/i.test(text)) return false;
    if (/^[\d\s$.,%-]+$/.test(text)) return false;
    return true;
  }

  function pickBestCandidate(candidates) {
    const scored = candidates
      .map((candidate) => {
        const text = cleanText(candidate?.text);
        if (!isLikelyProductName(text)) return null;

        let score = candidate.score || 0;
        if (text.length >= 10) score += 2;
        if (text.split(" ").length >= 2) score += 2;
        if (/\d/.test(text)) score += 1;
        if (candidate.inDialog) score += 3;
        return { text, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return scored[0]?.text || null;
  }

  function getDomainFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  }

  function getVendorBrandFromDomain(domain) {
    if (!domain) return "";
    const host = domain.split(".")[0] || domain;
    return host
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function extractMerchantInfo(root = document) {
    const anchors = Array.from(root.querySelectorAll("a[href^='http']"))
      .filter((anchor) => isVisible(anchor))
      .map((anchor) => {
        const domain = getDomainFromUrl(anchor.href);
        if (!domain) return null;
        if (domain.includes("google.")) return null;

        const text = cleanText(anchor.textContent);
        const cardText = cleanText(anchor.closest("div, li, article, section")?.textContent);
        let score = 0;
        if (text) score += 2;
        if (text && text.length <= 40) score += 2;
        if (/\$[0-9]/.test(cardText)) score += 3;
        if (/target|walmart|amazon|best buy|etsy|nike/i.test(text)) score += 3;

        return {
          name: text || getVendorBrandFromDomain(domain) || domain,
          domain,
          url: anchor.href,
          score,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return anchors[0] || null;
  }

  function detectGoogleShopping() {
    const isGoogleSurface =
      /(^|\.)google\./.test(location.hostname) &&
      (location.pathname.startsWith("/shopping") ||
        /[?&](tbm=shop|udm=28)\b/.test(location.search) ||
        cleanText(document.body?.innerText).includes("Google Shopping"));

    if (!isGoogleSurface) return null;

    const dialog = document.querySelector("div[role='dialog']");
    const roots = [dialog, document].filter(Boolean);
    const candidates = [];

    for (const root of roots) {
      const selectors = [
        "h1",
        "[role='heading'][aria-level='1']",
        "[role='heading'][aria-level='2']",
        "[data-attrid='title']",
        "[data-attrid='title'] *",
      ];

      for (const selector of selectors) {
        root.querySelectorAll(selector).forEach((el) => {
          if (!isVisible(el)) return;
          candidates.push({
            text: el.textContent,
            score: selector === "h1" ? 6 : 4,
            inDialog: root === dialog,
          });
        });
      }
    }

    const name = pickBestCandidate(candidates);
    if (!name) return null;

    let price = null;
    for (const root of roots) {
      const priceSelectors = [
        "[aria-label*='$']",
        "[data-shipment]",
        "[data-price]",
        "span",
      ];

      for (const selector of priceSelectors) {
        const els = Array.from(root.querySelectorAll(selector)).filter((el) => isVisible(el));
        for (const el of els) {
          price = parsePrice(el.getAttribute("aria-label") || el.textContent);
          if (price !== null) break;
        }
        if (price !== null) break;
      }
      if (price !== null) break;
    }

    const image =
      Array.from((dialog || document).querySelectorAll("img"))
        .filter((img) => isVisible(img) && img.naturalWidth >= 120 && img.naturalHeight >= 120)
        .map((img) => img.src)
        .find(Boolean) || "";

    const merchant = extractMerchantInfo(dialog || document);

    return {
      name,
      price,
      image,
      merchant,
      source: "adapter:google-shopping",
    };
  }

  // --- Site-Specific Adapters ---
  // Targeted detection for common demo sites. Each returns { name, price, image } or null.

  const siteAdapters = {
    "google.com": () => detectGoogleShopping(),
    "amazon.com": () => {
      const name =
        document.getElementById("productTitle")?.textContent?.trim() ||
        document.getElementById("title")?.textContent?.trim();
      if (!name) return null;
      const priceWhole = document.querySelector(".a-price .a-offscreen")?.textContent;
      const priceFallback =
        document.getElementById("priceblock_ourprice")?.textContent ||
        document.getElementById("priceblock_dealprice")?.textContent ||
        document.querySelector("#corePrice_feature_div .a-offscreen")?.textContent;
      const raw = priceWhole || priceFallback || "";
      const price = parseFloat(raw.replace(/[^0-9.]/g, "")) || null;
      const image =
        document.getElementById("landingImage")?.src ||
        document.getElementById("imgBlkFront")?.src ||
        document.querySelector("#main-image-container img")?.src || "";
      return { name, price, image, source: "adapter:amazon" };
    },

    "target.com": () => {
      const name = document.querySelector('[data-test="product-title"]')?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;
      const priceEl = document.querySelector('[data-test="product-price"]') ||
        document.querySelector('[data-test="product-regular-price"]');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
      const image = document.querySelector('[data-test="product-image"] img')?.src ||
        document.querySelector("picture img")?.src || "";
      return { name, price, image, source: "adapter:target" };
    },

    "nike.com": () => {
      const name = document.getElementById("pdp_product_title")?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;
      const priceEl = document.querySelector('[data-test="product-price"]') ||
        document.querySelector(".product-price") ||
        document.querySelector('[class*="currentPrice"]');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
      const image = document.querySelector("#pdp_product_image img")?.src ||
        document.querySelector('[data-test="hero-image"] img')?.src ||
        document.querySelector(".css-viwop1 img")?.src || "";
      return { name, price, image, source: "adapter:nike" };
    },

    "walmart.com": () => {
      const name = document.querySelector('[itemprop="name"]')?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;
      const priceEl = document.querySelector('[itemprop="price"]') ||
        document.querySelector('[data-testid="price-wrap"] span');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
      const image = document.querySelector('[data-testid="hero-image-container"] img')?.src ||
        document.querySelector(".hover-zoom-hero-image img")?.src || "";
      return { name, price, image, source: "adapter:walmart" };
    },

    "bestbuy.com": () => {
      const name = document.querySelector(".sku-title h1")?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;
      const priceEl = document.querySelector('.priceView-customer-price span:first-child') ||
        document.querySelector('[data-testid="customer-price"] span');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
      const image = document.querySelector(".primary-image img")?.src ||
        document.querySelector(".shop-media-gallery img")?.src || "";
      return { name, price, image, source: "adapter:bestbuy" };
    },

    "etsy.com": () => {
      const name = document.querySelector('[data-buy-box-listing-title]')?.textContent?.trim() ||
        document.querySelector("h1")?.textContent?.trim();
      if (!name) return null;
      const priceEl = document.querySelector('[data-buy-box-region="price"] .wt-text-title-03') ||
        document.querySelector('[data-buy-box-region="price"] p');
      const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
      const image = document.querySelector('[data-region="mainimage"] img')?.src ||
        document.querySelector(".listing-page-image-container img")?.src || "";
      return { name, price, image, source: "adapter:etsy" };
    },
  };

  // Shopify stores share a common structure
  function detectShopify() {
    const isShopify =
      document.querySelector('meta[name="shopify-digital-wallet"]') ||
      document.querySelector('link[href*="cdn.shopify.com"]') ||
      document.querySelector('script[src*="cdn.shopify.com"]');
    if (!isShopify) return null;
    const name = document.querySelector(".product-single__title, .product__title, h1.title")?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim();
    if (!name) return null;
    const priceEl = document.querySelector(".product__price, .product-single__price, [data-product-price]");
    const price = priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) : null;
    const image = document.querySelector(".product-single__photo img, .product__photo img, .product-featured-media img")?.src ||
      document.querySelector('meta[property="og:image"]')?.content || "";
    return { name, price, image, source: "adapter:shopify" };
  }

  function detectSiteAdapter() {
    const domain = location.hostname.replace(/^www\./, "");
    // Match adapter by domain suffix (handles amazon.co.uk, amazon.de, etc.)
    for (const [key, adapter] of Object.entries(siteAdapters)) {
      if (domain === key || domain.endsWith("." + key)) {
        try { return adapter(); } catch { return null; }
      }
    }
    // Try Shopify detection on any domain
    try { return detectShopify(); } catch { return null; }
  }

  // --- Promo Detection ---

  const PROMO_CODE_PATTERN = /\b(?:(?:use|apply|enter|try)\s+(?:code\s+)?|(?:code|coupon|promo)(?:\s*:\s*|\s+))["']?([A-Z0-9]{3,20})["']?/gi;
  const DISCOUNT_PATTERN = /(\d{1,2})%\s*(?:off|discount|savings?)|save\s+\$?(\d{1,5}(?:\.\d{2})?)|free\s+shipping/gi;
  const SIGNUP_PATTERN = /(?:sign\s*up|subscribe|join|register|email).*?(\d{1,2})%\s*off|(\d{1,2})%\s*off.*?(?:sign\s*up|subscribe|join|first\s*order|new\s*customer)/gi;

  function detectPromos() {
    const domain = location.hostname.replace(/^www\./, "");
    const promos = [];
    const seen = new Set();

    function addPromo(p) {
      const key = `${p.type}:${p.text?.substring(0, 60)}`;
      if (seen.has(key)) return;
      seen.add(key);
      promos.push({ ...p, domain });
    }

    detectStructuredPromos(addPromo);
    detectVisibleCodes(addPromo);
    detectCodeFields(addPromo, domain);
    detectSignupOffers(addPromo);
    detectSaleBanners(addPromo);

    return promos;
  }

  function detectStructuredPromos(add) {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const el of scripts) {
      try {
        let data = JSON.parse(el.textContent);
        if (data["@graph"]) data = data["@graph"];
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] !== "Product" && !(Array.isArray(item["@type"]) && item["@type"].includes("Product"))) continue;
          const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : [];
          for (const offer of offers) {
            if (offer.discount || offer.priceValidUntil || (offer.price && offer.lowPrice && parseFloat(offer.price) < parseFloat(offer.lowPrice))) {
              add({
                type: "structured_discount",
                text: offer.discount || `Sale price: $${offer.price}`,
                code: null,
                discountType: "unknown",
                discountValue: null,
                requiresSignup: false,
                confidence: "verified",
              });
            }
          }
        }
      } catch { /* ignore */ }
    }
  }

  function detectVisibleCodes(add) {
    const textEls = document.querySelectorAll(
      "header, [class*='banner'], [class*='promo'], [class*='coupon'], [class*='offer'], " +
      "[class*='discount'], [class*='sale'], [id*='promo'], [id*='banner'], " +
      "[role='banner'], [role='alert'], .announcement-bar, .promo-bar"
    );
    const bodySnippet = document.body?.innerText?.substring(0, 8000) || "";
    const allText = Array.from(textEls).map(el => el.textContent).join("\n") + "\n" + bodySnippet;

    let match;
    PROMO_CODE_PATTERN.lastIndex = 0;
    while ((match = PROMO_CODE_PATTERN.exec(allText)) !== null) {
      const code = match[1];
      if (code && code.length >= 3 && code.length <= 20) {
        const context = allText.substring(Math.max(0, match.index - 40), match.index + match[0].length + 40);
        add({
          type: "visible_code",
          text: context.trim().replace(/\s+/g, " ").substring(0, 120),
          code,
          discountType: guessDiscountType(context),
          discountValue: guessDiscountValue(context),
          requiresSignup: false,
          confidence: "likely",
        });
      }
    }
  }

  function detectCodeFields(add) {
    const inputs = document.querySelectorAll(
      'input[name*="promo"], input[name*="coupon"], input[name*="discount"], input[name*="code"], ' +
      'input[placeholder*="promo"], input[placeholder*="coupon"], input[placeholder*="discount"], input[placeholder*="code"], ' +
      'input[id*="promo"], input[id*="coupon"], input[id*="voucher"], input[aria-label*="promo"], input[aria-label*="coupon"]'
    );
    if (inputs.length > 0) {
      add({
        type: "code_field",
        text: "This store accepts promo codes at checkout",
        code: null,
        discountType: "unknown",
        discountValue: null,
        requiresSignup: false,
        confidence: "verified",
      });
    }
  }

  function detectSignupOffers(add) {
    const candidates = document.querySelectorAll(
      "[class*='popup'], [class*='modal'], [class*='newsletter'], [class*='signup'], " +
      "[class*='subscribe'], [class*='email-capture'], [id*='popup'], [id*='modal'], " +
      "[id*='newsletter'], [role='dialog'], [class*='overlay'], [class*='banner']"
    );
    const texts = Array.from(candidates).map(el => el.textContent || "");
    const fullText = texts.join("\n");

    SIGNUP_PATTERN.lastIndex = 0;
    let match;
    while ((match = SIGNUP_PATTERN.exec(fullText)) !== null) {
      const pct = parseInt(match[1] || match[2]);
      if (pct > 0 && pct <= 50) {
        add({
          type: "signup_offer",
          text: `${pct}% off for new subscribers / first-time sign up`,
          code: null,
          discountType: "percentage",
          discountValue: pct,
          requiresSignup: true,
          confidence: "likely",
        });
        break; // one signup offer is enough
      }
    }
  }

  function detectSaleBanners(add) {
    const bannerEls = document.querySelectorAll(
      "[class*='sale'], [class*='banner'], [class*='announcement'], " +
      "[class*='promo'], [class*='offer'], [class*='deal'], .hero, " +
      "header, [role='banner']"
    );
    for (const el of bannerEls) {
      const text = el.textContent?.trim() || "";
      if (text.length > 500) continue;
      DISCOUNT_PATTERN.lastIndex = 0;
      const match = DISCOUNT_PATTERN.exec(text);
      if (match) {
        const pctOff = match[1] ? parseInt(match[1]) : null;
        const dollarOff = match[2] ? parseFloat(match[2]) : null;
        const isFreeShip = /free\s+shipping/i.test(match[0]);
        add({
          type: "sale_banner",
          text: text.replace(/\s+/g, " ").substring(0, 120),
          code: null,
          discountType: isFreeShip ? "free_shipping" : pctOff ? "percentage" : dollarOff ? "fixed" : "unknown",
          discountValue: pctOff || dollarOff || null,
          requiresSignup: false,
          confidence: "weak",
        });
        break; // one banner is enough
      }
    }
  }

  function guessDiscountType(text) {
    if (/\d+%/i.test(text)) return "percentage";
    if (/\$\d/i.test(text)) return "fixed";
    if (/free\s*ship/i.test(text)) return "free_shipping";
    return "unknown";
  }

  function guessDiscountValue(text) {
    const pct = text.match(/(\d{1,2})%/);
    if (pct) return parseInt(pct[1]);
    const dollar = text.match(/\$(\d{1,5}(?:\.\d{2})?)/);
    if (dollar) return parseFloat(dollar[1]);
    return null;
  }

  // --- Generic Product Detection ---

  function detectJsonLd() {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    for (const el of scripts) {
      try {
        let data = JSON.parse(el.textContent);

        // Handle @graph wrapper
        if (data["@graph"] && Array.isArray(data["@graph"])) {
          data =
            data["@graph"].find(
              (n) =>
                n["@type"] === "Product" ||
                (Array.isArray(n["@type"]) && n["@type"].includes("Product"))
            ) || data;
        }

        const type = data["@type"];
        const isProduct =
          type === "Product" ||
          (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;

        const name = data.name;
        let price = null;
        if (data.offers) {
          const offer = Array.isArray(data.offers)
            ? data.offers[0]
            : data.offers;
          price =
            parseFloat(offer.price) ||
            parseFloat(offer.lowPrice) ||
            null;
        }
        const image = Array.isArray(data.image)
          ? data.image[0]
          : data.image || "";

        if (name) return { name, price, image, source: "json-ld" };
      } catch {
        // ignore parse errors
      }
    }
    return null;
  }

  function detectOpenGraph() {
    const title =
      document.querySelector('meta[property="og:title"]')?.content ||
      document.querySelector('meta[property="twitter:title"]')?.content;
    const image = document.querySelector('meta[property="og:image"]')?.content;
    const priceStr =
      document.querySelector('meta[property="product:price:amount"]')
        ?.content ||
      document.querySelector('meta[property="og:price:amount"]')?.content;
    const siteName = document.querySelector(
      'meta[property="og:site_name"]'
    )?.content;

    const price = priceStr ? parseFloat(priceStr) : null;

    if (title) return { name: title, price, image, siteName, source: "og" };
    return null;
  }

  function detectDomHeuristics() {
    const headingCandidates = Array.from(
      document.querySelectorAll(
        "h1, [role='heading'][aria-level='1'], main h2, article h2"
      )
    )
      .filter((el) => isVisible(el))
      .map((el, index) => ({ text: el.textContent, score: index === 0 ? 3 : 1 }));

    const name = pickBestCandidate(headingCandidates);
    if (!name) return null;

    // Price detection: look for dollar amounts near the h1
    const priceSelectors = [
      '[data-price]',
      '.price',
      '.product-price',
      '#price',
      '[class*="price"]',
      'span[class*="Price"]',
    ];

    let price = null;
    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        price = parsePrice(el.textContent);
        if (price !== null) break;
        const dataPrice = el.getAttribute("data-price");
        if (dataPrice) {
          price = parseFloat(dataPrice);
          break;
        }
      }
    }

    // Also try the whole page body for a price near the top
    if (price === null) {
      const bodyText = document.body?.innerText?.substring(0, 5000) || "";
      price = parsePrice(bodyText);
    }

    const image =
      document.querySelector('meta[property="og:image"]')?.content ||
      document.querySelector("main img, article img, .product img")?.src ||
      "";

    return { name, price, image, source: "dom" };
  }

  function detectProduct() {
    return detectSiteAdapter() || detectJsonLd() || detectOpenGraph() || detectDomHeuristics();
  }

  // --- Vendor Info ---

  function getVendorInfo(product = null) {
    const pageDomain = location.hostname.replace(/^www\./, "");
    const siteName =
      document.querySelector('meta[property="og:site_name"]')?.content ||
      pageDomain;
    const merchantDomain = product?.merchant?.domain || pageDomain;
    const merchantName = product?.merchant?.name || siteName || merchantDomain;

    let hash = 0;
    for (const ch of merchantDomain) {
      hash = (hash << 5) - hash + ch.charCodeAt(0);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;

    return {
      name: merchantName,
      domain: merchantDomain,
      pageDomain,
      sourceUrl: product?.merchant?.url || location.href,
      sourceLabel:
        merchantDomain === pageDomain
          ? merchantName
          : `${merchantName} via ${pageDomain}`,
      favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(merchantDomain)}&sz=32`,
      accentColor: `hsl(${hue}, 65%, 60%)`,
      did: "", // generated async in verum.js
    };
  }

  function generateItemId(domain, name, options = {}) {
    let hash = 0;
    const str = [
      domain,
      name,
      options.price ?? "",
      options.image ?? "",
      options.sourceUrl ?? "",
      options.pageDomain ?? "",
    ].join("::");
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `item_${Math.abs(hash).toString(36)}`;
  }

  // --- Floating Button (Shadow DOM) ---

  let hostEl = null;

  function createFloatingUI(product) {
    if (hostEl) hostEl.remove();

    hostEl = document.createElement("div");
    hostEl.id = "universalcart-host";
    hostEl.style.cssText =
      "position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;";

    const shadow = hostEl.attachShadow({ mode: "closed" });

    const vendor = getVendorInfo(product);
    const priceDisplay =
      product.price != null ? `$${product.price.toFixed(2)}` : "Price not detected";
    const nameDisplay =
      product.name.length > 60
        ? product.name.substring(0, 57) + "..."
        : product.name;

    shadow.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :host { all: initial; }

        .uc-fab {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px 10px 12px;
          background: #18181b;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15);
          cursor: pointer;
          transition: all 0.2s ease;
          max-width: 340px;
          user-select: none;
          -webkit-user-select: none;
        }
        .uc-fab:hover {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.3);
          transform: translateY(-2px);
        }

        .uc-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .uc-icon svg { width: 18px; height: 18px; }

        .uc-info { flex: 1; min-width: 0; }
        .uc-label {
          font-size: 10px;
          font-weight: 600;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .uc-product {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .uc-price {
          font-size: 12px;
          font-weight: 700;
          color: #818cf8;
          margin-top: 1px;
        }

        .uc-close {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border: none;
          background: rgba(255,255,255,0.06);
          border-radius: 6px;
          color: #71717a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
          transition: all 0.15s;
        }
        .uc-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

        .uc-added {
          display: none;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #34d399;
        }
        .uc-added svg { width: 16px; height: 16px; }

        .uc-fab.added .uc-info { display: none; }
        .uc-fab.added .uc-added { display: flex; }
        .uc-fab.added { border-color: rgba(52,211,153,0.3); }
      </style>

      <div class="uc-fab" id="fab">
        <div class="uc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <div class="uc-info">
          <div class="uc-label">Add to UniversalCart</div>
          <div class="uc-product">${escapeHtml(nameDisplay)}</div>
          <div class="uc-price">${escapeHtml(priceDisplay)}</div>
        </div>
        <div class="uc-added" id="added-msg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Added to cart!
        </div>
        <button class="uc-close" id="close-btn" title="Dismiss">&times;</button>
      </div>
    `;

    const fab = shadow.getElementById("fab");
    const closeBtn = shadow.getElementById("close-btn");

    fab.addEventListener("click", async (e) => {
      if (e.target === closeBtn || closeBtn.contains(e.target)) return;

      const item = {
        id: generateItemId(vendor.domain, product.name, {
          price: product.price,
          image: product.image,
          sourceUrl: vendor.sourceUrl,
          pageDomain: vendor.pageDomain,
        }),
        name: product.name,
        price: product.price || 0,
        image: product.image || "",
        quantity: 1,
        url: location.href,
        vendor,
      };

      try {
        await chrome.runtime.sendMessage({ type: "ADD_ITEM", item });
      } catch {
        // Extension context invalidated
      }

      fab.classList.add("added");
      setTimeout(() => {
        fab.classList.remove("added");
      }, 2000);
    });

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hostEl.style.transition = "opacity 0.2s, transform 0.2s";
      hostEl.style.opacity = "0";
      hostEl.style.transform = "translateY(10px)";
      setTimeout(() => hostEl.remove(), 200);
    });

    document.body.appendChild(hostEl);

    // Animate in
    hostEl.style.opacity = "0";
    hostEl.style.transform = "translateY(10px)";
    requestAnimationFrame(() => {
      hostEl.style.transition = "opacity 0.3s, transform 0.3s";
      hostEl.style.opacity = "1";
      hostEl.style.transform = "translateY(0)";
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Message Handling ---

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "DETECT_PRODUCT") {
      const product = detectProduct();
      if (product) {
        const vendor = getVendorInfo(product);
        const item = {
          id: generateItemId(vendor.domain, product.name, {
            price: product.price,
            image: product.image,
            sourceUrl: vendor.sourceUrl,
            pageDomain: vendor.pageDomain,
          }),
          name: product.name,
          price: product.price || 0,
          image: product.image || "",
          quantity: 1,
          url: location.href,
          vendor,
        };
        sendResponse([{ product: item }]);
      } else {
        sendResponse([{ product: null }]);
      }
    }
    if (message.type === "DETECT_PROMOS") {
      const promos = detectPromos();
      sendResponse({ promos });
    }
    return false;
  });

  // --- Init ---

  function init() {
    const product = detectProduct();
    if (product) {
      createFloatingUI(product);

      try {
        chrome.runtime.sendMessage({
          type: "PRODUCT_DETECTED",
          product: {
            ...product,
            url: location.href,
            vendor: getVendorInfo(product),
          },
        });
      } catch {
        // Side panel may not be open
      }
    }

    // Detect promos on the page and notify
    try {
      const promos = detectPromos();
      if (promos.length > 0) {
        chrome.runtime.sendMessage({
          type: "PROMOS_DETECTED",
          promos,
          url: location.href,
        });
      }
    } catch {
      // Extension context invalidated
    }
  }

  // Run after page settles
  if (document.readyState === "complete") {
    setTimeout(init, 500);
  } else {
    window.addEventListener("load", () => setTimeout(init, 500));
  }

  // Retry for SPAs that load content dynamically
  setTimeout(() => {
    if (!hostEl) init();
  }, 3000);
})();
