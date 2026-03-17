import { Router, Request, Response } from 'express';
import { getOrchestrator } from '../services/agent-orchestrator';
import { validate, PriceScoutBody, PriceScoutBatchBody } from '../middleware/validate';

/**
 * Price Scout Routes — now wired to the real PriceScoutAgent.
 * Searches Google Shopping, major retailers, and uses LLM to verify matches.
 */

const router = Router();

// Search for cheaper prices on a single product
router.post('/', validate({ body: PriceScoutBody }), async (req: Request, res: Response) => {
  const { name, price, vendor, universalId, vendorSku } = req.body;

  try {
    const orchestrator = getOrchestrator();
    const result = await orchestrator.findCheaperPrice({
      name, price, vendor, universalId, vendorSku,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch search for all items in cart
router.post('/batch', validate({ body: PriceScoutBatchBody }), async (req: Request, res: Response) => {
  const { items } = req.body;

  try {
    const orchestrator = getOrchestrator();
    const results = await orchestrator.findCheaperPrices(items);

    // Convert Map to object for JSON response
    const resultsObj: Record<string, any> = {};
    results.forEach((value, key) => {
      resultsObj[key] = value;
    });

    res.json({
      results: resultsObj,
      totalSearched: items.length,
      cheaperFound: Object.values(resultsObj).filter((r: any) => r.bestAlternative).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as priceScoutRouter };
