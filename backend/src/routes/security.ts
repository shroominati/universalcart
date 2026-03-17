import { Router, Request, Response } from 'express';
import { requireAuth } from '../services/auth';
import { getAuditLogger } from '../services/audit-logger';
import { getKeyRotationService } from '../services/api-key-rotation';
import { getWSEncryption } from '../services/encrypted-websocket';
import { getRateLimiterStats } from '../middleware/rate-limiter';
import { generateCsrfToken } from '../middleware/security';
import { validate, AuditQuery, ServiceParam, RotateKeyBody } from '../middleware/validate';

const router = Router();

// ── CSRF Token ───────────────────────────────────────────────────────────────
// GET /api/security/csrf-token
router.get('/csrf-token', (req: Request, res: Response) => {
  const sessionId = (req as any).userId || 'anon';
  const token = generateCsrfToken(sessionId);
  res.json({ csrfToken: token });
});

// ── Audit Logs ───────────────────────────────────────────────────────────────
// GET /api/security/audit — query audit log (admin only)
router.get('/audit', requireAuth, validate({ query: AuditQuery }), (req: Request, res: Response) => {
  const audit = getAuditLogger();
  const { type, severity, since, until, limit } = req.query;

  const entries = audit.query({
    type: type as string,
    userId: (req as any).userId,
    severity: severity as any,
    since: since ? parseInt(since as string) : undefined,
    until: until ? parseInt(until as string) : undefined,
    limit: limit ? parseInt(limit as string) : 50,
  });

  res.json({ entries, total: entries.length });
});

// GET /api/security/audit/stats
router.get('/audit/stats', requireAuth, (_req: Request, res: Response) => {
  const audit = getAuditLogger();
  res.json(audit.getStats());
});

// POST /api/security/audit/verify-chain — verify tamper-proof chain
router.post('/audit/verify-chain', requireAuth, (_req: Request, res: Response) => {
  const audit = getAuditLogger();
  const result = audit.verifyChain();
  res.json(result);
});

// ── API Key Status ───────────────────────────────────────────────────────────
// GET /api/security/keys/status
router.get('/keys/status', requireAuth, (_req: Request, res: Response) => {
  const keyService = getKeyRotationService();
  res.json(keyService.getStatus());
});

// POST /api/security/keys/:service/rotate
router.post('/keys/:service/rotate', requireAuth, validate({ params: ServiceParam, body: RotateKeyBody }), async (req: Request, res: Response) => {
  const keyService = getKeyRotationService();
  const { service } = req.params;
  const { newKey } = req.body || {};

  const result = await keyService.rotateKey(service, newKey);
  res.json(result);
});

// POST /api/security/keys/health-check
router.post('/keys/health-check', requireAuth, async (_req: Request, res: Response) => {
  const keyService = getKeyRotationService();
  const results = await keyService.checkAllHealth();
  res.json(results);
});

// ── Rate Limiter Stats ──────────────────────────────────────────────────────
// GET /api/security/rate-limit/stats
router.get('/rate-limit/stats', requireAuth, (_req: Request, res: Response) => {
  res.json(getRateLimiterStats());
});

// ── WebSocket Encryption Stats ──────────────────────────────────────────────
// GET /api/security/ws/stats
router.get('/ws/stats', requireAuth, (_req: Request, res: Response) => {
  const wsEnc = getWSEncryption();
  res.json(wsEnc.getStats());
});

// ── Security Dashboard Summary ──────────────────────────────────────────────
// GET /api/security/dashboard
router.get('/dashboard', requireAuth, (_req: Request, res: Response) => {
  const audit = getAuditLogger();
  const keyService = getKeyRotationService();
  const wsEnc = getWSEncryption();
  const rateLimiter = getRateLimiterStats();

  res.json({
    auditLog: audit.getStats(),
    apiKeys: keyService.getStatus(),
    websocketEncryption: wsEnc.getStats(),
    rateLimiter,
    chainIntegrity: audit.verifyChain(),
    timestamp: Date.now(),
  });
});

export { router as securityRouter };
