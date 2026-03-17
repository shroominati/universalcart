import { Router, Request, Response } from 'express';
import { getAuthService, requireAuth } from '../services/auth';
import { validate, RegisterBody, LoginBody } from '../middleware/validate';

/**
 * Auth Routes
 *
 * POST /api/auth/register  — Create new account
 * POST /api/auth/login     — Login, get session token
 * POST /api/auth/logout    — Invalidate current session
 * GET  /api/auth/me        — Get current user info
 */

export const authRouter = Router();

// Register
authRouter.post('/register', validate({ body: RegisterBody }), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const auth = getAuthService();
    const result = await auth.register(email, password);

    res.status(201).json({
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    const status = err.message.includes('already registered') ? 409 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Login
authRouter.post('/login', validate({ body: LoginBody }), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const auth = getAuthService();
    const userAgent = req.headers['user-agent'];
    const result = await auth.login(email, password, userAgent);

    res.json({
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// Logout
authRouter.post('/logout', requireAuth, (req: any, res: Response) => {
  const auth = getAuthService();
  auth.logout(req.session.token);
  res.json({ message: 'Logged out successfully' });
});

// Logout all sessions
authRouter.post('/logout-all', requireAuth, (req: any, res: Response) => {
  const auth = getAuthService();
  auth.logoutAll(req.userId);
  res.json({ message: 'All sessions invalidated' });
});

// Get current user
authRouter.get('/me', requireAuth, (req: any, res: Response) => {
  const auth = getAuthService();
  const user = auth.getUserById(req.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});
