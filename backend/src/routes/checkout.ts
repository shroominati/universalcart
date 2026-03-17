import { Router, Request, Response } from 'express';
import { getOrchestrator } from '../services/agent-orchestrator';
import { validate, StartCheckoutBody, ShippingProfileBody, PaymentMethodBody, IdParam } from '../middleware/validate';

/**
 * Checkout Orchestration Routes
 *
 * Now wired to the real AgentOrchestrator with:
 * - Playwright browser automation
 * - LLM-guided navigation for unknown vendors
 * - Parallel execution via checkout queue
 * - AES-256 encrypted credential vault
 */

const router = Router();

// Start checkout for all vendors in cart
router.post('/start', validate({ body: StartCheckoutBody }), async (req: Request, res: Response) => {
  const { cart, shippingProfileId, paymentMethodId, userId, applyPromos, dryRun } = req.body;

  try {
    const orchestrator = getOrchestrator();
    const result = await orchestrator.startCheckout(cart, {
      shippingProfileId,
      paymentMethodId,
      userId: userId || (req.headers['x-user-id'] as string) || 'default',
      applyPromos: applyPromos !== false,
      dryRun: dryRun !== false, // Default to dry run for safety
    });

    res.json({
      success: true,
      message: `${result.totalJobs} checkout agents launched`,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

// Get queue status (all jobs)
router.get('/status', (_req: Request, res: Response) => {
  const orchestrator = getOrchestrator();
  res.json(orchestrator.getQueueStatus());
});

// Get specific job status
router.get('/jobs/:id', validate({ params: IdParam }), (req: Request, res: Response) => {
  const orchestrator = getOrchestrator();
  const status = orchestrator.getQueueStatus();
  const job = [...status.queued, ...status.running, ...status.completed]
    .find(j => j.id === req.params.id);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(job);
});

// Cancel a checkout job
router.delete('/jobs/:id', validate({ params: IdParam }), (req: Request, res: Response) => {
  const orchestrator = getOrchestrator();
  const cancelled = orchestrator.cancelJob(req.params.id);
  res.json({ success: cancelled });
});

// ─── Shipping Profiles (AES-256 encrypted) ─────────────────────────────

router.post('/profiles/shipping', validate({ body: ShippingProfileBody }), async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const profile = {
    id: `ship_${Date.now()}`,
    isDefault: true,
    ...req.body,
  };

  const vault = getOrchestrator().getVault();
  await vault.saveShippingProfile(userId, profile);
  res.json({ success: true, profileId: profile.id });
});

router.get('/profiles/shipping', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const vault = getOrchestrator().getVault();
  const profiles = await vault.listShippingProfiles(userId);
  res.json(profiles);
});

router.delete('/profiles/shipping/:id', validate({ params: IdParam }), async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const vault = getOrchestrator().getVault();
  await vault.deleteShippingProfile(userId, req.params.id);
  res.json({ success: true });
});

// ─── Payment Methods (encrypted, card numbers redacted in responses) ───

router.post('/profiles/payment', validate({ body: PaymentMethodBody }), async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const method = {
    id: `pay_${Date.now()}`,
    isDefault: true,
    ...req.body,
  };

  const vault = getOrchestrator().getVault();
  await vault.savePaymentMethod(userId, method);
  res.json({
    success: true,
    paymentId: method.id,
    display: `Card ending in ${method.cardNumber?.slice(-4)}`,
  });
});

router.get('/profiles/payment', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const vault = getOrchestrator().getVault();
  const methods = await vault.listPaymentMethods(userId);
  res.json(methods);
});

router.delete('/profiles/payment/:id', validate({ params: IdParam }), async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'default';
  const vault = getOrchestrator().getVault();
  await vault.deletePaymentMethod(userId, req.params.id);
  res.json({ success: true });
});

export { router as checkoutRouter };
