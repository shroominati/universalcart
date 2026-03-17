import { Router, Request, Response } from 'express';
import { getCartStore } from '../services/persistent-cart';
import { validate, AddItemBody, SyncCartBody, UpdateItemBody, CartSettingsBody, IdParam } from '../middleware/validate';

/**
 * Cart Routes — Persistent Cart API
 *
 * Full cart management with price history, watchlists, and analytics.
 * Items persist indefinitely, prices auto-refresh on a schedule.
 */

const router = Router();

// Sync cart from extension
router.post('/sync', validate({ body: SyncCartBody }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const store = getCartStore();
  const incoming = req.body?.items || [];

  let added = 0;
  for (const item of incoming) {
    store.addItem(userId, {
      name: item.name,
      price: item.price,
      currency: item.currency || 'USD',
      image: item.image || '',
      sourceUrl: item.sourceUrl,
      vendor: item.vendor,
      vendorSku: item.vendorSku,
      universalId: item.universalId,
      variant: item.variant,
      quantity: item.quantity || 1,
    });
    added++;
  }

  res.json({ success: true, itemsSynced: added, syncedAt: Date.now() });
});

// Get full cart
router.get('/', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const store = getCartStore();
  res.json(store.getCart(userId));
});

// Cart summary with savings analytics
router.get('/summary', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getCartSummary(userId));
});

// Add item
router.post('/items', validate({ body: AddItemBody }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const item = getCartStore().addItem(userId, {
    name: req.body.name,
    price: req.body.price,
    currency: req.body.currency || 'USD',
    image: req.body.image || '',
    sourceUrl: req.body.sourceUrl,
    vendor: req.body.vendor,
    vendorSku: req.body.vendorSku,
    universalId: req.body.universalId,
    variant: req.body.variant,
    quantity: req.body.quantity || 1,
  });
  res.json({ success: true, item });
});

// Update item (quantity, status, notes, tags, price alert threshold)
router.patch('/items/:id', validate({ params: IdParam, body: UpdateItemBody }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const item = getCartStore().updateItem(userId, req.params.id, req.body);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, item });
});

// Remove item
router.delete('/items/:id', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json({ success: getCartStore().removeItem(userId, req.params.id) });
});

// Move to watchlist
router.post('/items/:id/watchlist', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const item = getCartStore().moveToWatchlist(userId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, item });
});

// Move to active cart
router.post('/items/:id/active', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const item = getCartStore().moveToActive(userId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, item });
});

// Mark purchased
router.post('/items/:id/purchased', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const item = getCartStore().markPurchased(userId, req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, item });
});

// Price history for item
router.get('/items/:id/price-history', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getPriceHistory(userId, req.params.id));
});

// Price analytics for item
router.get('/items/:id/analytics', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const analytics = getCartStore().getPriceAnalytics(userId, req.params.id);
  if (!analytics) return res.status(404).json({ error: 'Item not found or no data' });
  res.json(analytics);
});

// Manual refresh single item price
router.post('/items/:id/refresh', validate({ params: IdParam }), async (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const snapshot = await getCartStore().refreshItem(userId, req.params.id);
  if (!snapshot) return res.status(404).json({ error: 'Item not found or price checker not configured' });
  res.json({ success: true, snapshot });
});

// Items with price drops since added
router.get('/drops', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getItemsWithPriceDrops(userId));
});

// Items at all-time low
router.get('/lowest', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getItemsAtLowest(userId));
});

// Out of stock items
router.get('/out-of-stock', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getOutOfStockItems(userId));
});

// Watchlist
router.get('/watchlist', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().getWatchlistItems(userId));
});

// Update cart settings
router.patch('/settings', validate({ body: CartSettingsBody }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getCartStore().updateSettings(userId, req.body));
});

// Refresh all item prices
router.post('/refresh-all', async (_req: Request, res: Response) => {
  const result = await getCartStore().runAutoRefresh();
  res.json({ success: true, ...result });
});

// Clear cart
router.delete('/', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const cart = getCartStore().getCart(userId);
  cart.items = [];
  cart.lastUpdated = Date.now();
  res.json({ success: true });
});

export { router as cartRouter };
