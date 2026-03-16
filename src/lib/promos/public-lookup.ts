const SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const SEARCH_TIMEOUT_MS = 8_000;
const MAX_SUGGESTIONS = 5;
const CODE_PATTERN =
  /\b(?:use|apply|enter)?\s*(?:promo|coupon)?\s*code[:\s"']*([A-Z0-9-]{4,20})\b/gi;
const PERCENT_PATTERN = /(\d{1,2})\s*%\s*off/i;
const FIXED_PATTERN = /\$(\d{1,3})\s*off/i;
const FREE_SHIPPING_PATTERN = /free\s+shipping/i;
const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};
const CODE_STOPWORDS = new Set([
  "PROMO",
  "COUPON",
  "DISCOUNT",
  "CHECKOUT",
  "ONLINE",
  "SHOPPING",
  "SHIPPING",
  "SAVINGS",
]);

export interface PublicPromoSuggestion {
  type: "public_lookup_code";
  domain: string;
  text: string;
  code: string;
  confidence: "likely" | "weak";
  discountType: "percentage" | "fixed" | "free_shipping" | "unknown";
  discountValue: number | null;
  requiresSignup: false;
  sourceUrl: string;
}

function decodeHtml(input: string): string {
  return input
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITY_MAP[entity] || entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function htmlToTextBlocks(input: string): string[] {
  const withBreaks = decodeHtml(input).replace(
    /<\/(?:div|p|li|a|span|section|article|h\d|br)>/gi,
    "\n"
  );

  return stripTags(withBreaks)
    .split(/\n+/)
    .map(normalizeWhitespace)
    .filter(Boolean);
}

function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function looksLikeCouponCode(code: string): boolean {
  if (code.length < 4 || code.length > 20) return false;
  if (!/[A-Z]/.test(code)) return false;
  if (/^\d+$/.test(code)) return false;
  return !CODE_STOPWORDS.has(code);
}

function inferDiscount(text: string): {
  discountType: PublicPromoSuggestion["discountType"];
  discountValue: number | null;
} {
  const percent = text.match(PERCENT_PATTERN);
  if (percent) {
    return {
      discountType: "percentage",
      discountValue: Number(percent[1]),
    };
  }

  const fixed = text.match(FIXED_PATTERN);
  if (fixed) {
    return {
      discountType: "fixed",
      discountValue: Number(fixed[1]),
    };
  }

  if (FREE_SHIPPING_PATTERN.test(text)) {
    return {
      discountType: "free_shipping",
      discountValue: null,
    };
  }

  return {
    discountType: "unknown",
    discountValue: null,
  };
}

function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 70);
  const end = Math.min(text.length, index + length + 110);
  return normalizeWhitespace(text.slice(start, end));
}

function baseStoreQuery(domain: string, vendorName?: string): string {
  if (vendorName?.trim()) return vendorName.trim();
  return domain
    .replace(/^www\./, "")
    .replace(/\.(com|net|org|io|co|us|shop|store)$/i, "")
    .replace(/[-_.]/g, " ")
    .trim();
}

export function extractPromoSuggestionsFromHtml(
  html: string,
  domain: string,
  sourceUrl: string
): PublicPromoSuggestion[] {
  const blocks = htmlToTextBlocks(html);
  const suggestions: PublicPromoSuggestion[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    CODE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = CODE_PATTERN.exec(block)) !== null) {
      const code = normalizeCode(match[1] || "");
      if (!looksLikeCouponCode(code)) continue;
      if (seen.has(code)) continue;

      const snippet = extractSnippet(block, match.index, match[0].length);
      const { discountType, discountValue } = inferDiscount(snippet);
      suggestions.push({
        type: "public_lookup_code",
        domain,
        text: snippet,
        code,
        confidence: discountType === "unknown" ? "weak" : "likely",
        discountType,
        discountValue,
        requiresSignup: false,
        sourceUrl,
      });
      seen.add(code);

      if (suggestions.length >= MAX_SUGGESTIONS) {
        return suggestions;
      }
    }
  }

  return suggestions;
}

async function fetchSearchHtml(query: string): Promise<string> {
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; UniversalCartPromoLookup/1.0; +https://github.com/shroominati/universalcart)",
      "accept-language": "en-US,en;q=0.9",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Search fetch failed with status ${response.status}`);
  }

  return response.text();
}

export async function lookupPublicPromoSuggestions(input: {
  domain: string;
  vendorName?: string;
}): Promise<{
  query: string;
  suggestions: PublicPromoSuggestion[];
  warnings: string[];
}> {
  const queryBase = baseStoreQuery(input.domain, input.vendorName);
  const query = `${queryBase} promo code coupon`;
  const sourceUrl = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`;

  try {
    const html = await fetchSearchHtml(query);
    return {
      query,
      suggestions: extractPromoSuggestionsFromHtml(html, input.domain, sourceUrl),
      warnings: [
        "Public coupon suggestions are scraped from search results and may be expired or inaccurate.",
      ],
    };
  } catch (error) {
    return {
      query,
      suggestions: [],
      warnings: [
        error instanceof Error ? error.message : "Public coupon lookup failed",
      ],
    };
  }
}
