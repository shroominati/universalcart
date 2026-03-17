import { Router, Request, Response } from 'express';
import { getNotificationService } from '../services/notification-service';
import { validate, NotificationQuery, NotificationPrefsBody, IdParam } from '../middleware/validate';

/**
 * Notification Routes
 *
 * GET    /                  — Get notifications (supports filters)
 * GET    /unread-count      — Get unread count
 * POST   /:id/read          — Mark notification as read
 * POST   /read-all          — Mark all as read
 * DELETE /:id               — Delete a notification
 * GET    /preferences       — Get notification preferences
 * PATCH  /preferences       — Update preferences
 * GET    /stats             — Notification stats
 */

const router = Router();

// Get notifications
router.get('/', validate({ query: NotificationQuery }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const service = getNotificationService();

  const notifications = service.getNotifications(userId, {
    unreadOnly: req.query.unread === 'true',
    type: req.query.type as any,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
  });

  res.json({
    notifications,
    unreadCount: service.getUnreadCount(userId),
  });
});

// Unread count
router.get('/unread-count', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json({ count: getNotificationService().getUnreadCount(userId) });
});

// Mark read
router.post('/:id/read', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const success = getNotificationService().markRead(userId, req.params.id);
  res.json({ success });
});

// Mark all read
router.post('/read-all', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const count = getNotificationService().markAllRead(userId);
  res.json({ success: true, markedRead: count });
});

// Delete notification
router.delete('/:id', validate({ params: IdParam }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  const success = getNotificationService().deleteNotification(userId, req.params.id);
  res.json({ success });
});

// Get preferences
router.get('/preferences', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getNotificationService().getPreferences(userId));
});

// Update preferences
router.patch('/preferences', validate({ body: NotificationPrefsBody }), (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getNotificationService().updatePreferences(userId, req.body));
});

// Stats
router.get('/stats', (req: Request, res: Response) => {
  const userId = (req as any).userId || 'default';
  res.json(getNotificationService().getStats(userId));
});

export { router as notificationsRouter };
