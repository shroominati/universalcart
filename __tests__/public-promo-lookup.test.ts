import { describe, expect, it } from "vitest";
import { extractPromoSuggestionsFromHtml } from "@/lib/promos/public-lookup";

describe("extractPromoSuggestionsFromHtml", () => {
  it("extracts coupon codes and discount details from search-result-like HTML", () => {
    const html = `
      <div class="result">
        <a href="https://example-coupons.test">Ulta promo code SAVE20 for 20% off your order</a>
        <span>Use code SAVE20 to get 20% off select styling products.</span>
      </div>
      <div class="result">
        <a href="https://example-coupons.test">Back Market coupon code TAKE15 for $15 off</a>
        <span>Enter code TAKE15 at checkout for $15 off eligible devices.</span>
      </div>
    `;

    const suggestions = extractPromoSuggestionsFromHtml(
      html,
      "ulta.com",
      "https://html.duckduckgo.com/html/?q=ulta+promo+code"
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      code: "SAVE20",
      confidence: "likely",
      discountType: "percentage",
      discountValue: 20,
      domain: "ulta.com",
      type: "public_lookup_code",
    });
    expect(suggestions[1]).toMatchObject({
      code: "TAKE15",
      confidence: "likely",
      discountType: "fixed",
      discountValue: 15,
    });
  });

  it("ignores duplicates and generic non-code words", () => {
    const html = `
      <div>Coupon code PROMO for your cart.</div>
      <div>Use code WELCOME15 for 15% off today.</div>
      <div>Use code WELCOME15 for 15% off today.</div>
    `;

    const suggestions = extractPromoSuggestionsFromHtml(
      html,
      "savagex.com",
      "https://html.duckduckgo.com/html/?q=savage+x+promo+code"
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.code).toBe("WELCOME15");
  });
});
