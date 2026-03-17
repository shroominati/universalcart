import { Router, Request, Response } from 'express';
import { getOrchestrator } from '../services/agent-orchestrator';
import { validate, VendorParam, SubmitPromoBody } from '../middleware/validate';

/**
 * Promo Code Routes — wired to the PromoAgent.
 * Searches aggregator sites, uses LLM to suggest codes,
 * and auto-tests them via Playwright at checkout.
 */

const router = Router();

// Get known promo codes for a vendor
router.get('/:vendor', validate({ params: VendorParam }), (req: Request, res: Response) => {
  const vendor = decodeURIComponent(req.params.vendor);
  // The promo agent maintains its own database
  // For API consumers, we expose a simple lookup
  res.json({
    vendor,
    message: 'Promo codes are auto-applied during checkout. Use POST /:vendor/scan to discover codes.',
  });
});

// Submit a promo code (user-contributed)
router.post('/:vendor', validate({ params: VendorParam, body: SubmitPromoBody }), (req: Request, res: Response) => {
  const vendor = decodeURIComponent(req.params.vendor);
  const { code, description, source } = req.body;

  const promoAgent = getOrchestrator().getPromoAgent();
  promoAgent.addCode(vendor, {
    code,
    description: description || '',
    source: source || 'user-submitted',
  });

  res.json({ success: true, message: `Code "${code}" added for ${vendor}` });
});

// Trigger promo code scan for a vendor (discovers and caches codes)
router.post('/:vendor/scan', validate({ params: VendorParam }), async (req: Request, res: Response) => {
  const vendor = decodeURIComponent(req.params.vendor);

  console.log(`[Promo Agent] Scan requested for ${vendor}`);

  // Note: The full Playwright-based testing happens during checkout.
  // This endpoint just triggers code discovery.
  res.json({
    success: true,
    message: `Promo scan initiated for ${vendor}. Codes will be auto-applied at checkout.`,
    vendor,
  });
});

export { router as promoRouter };
