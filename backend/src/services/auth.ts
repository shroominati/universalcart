import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Authentication Service
 *
 * Handles user registration, login, and session management.
 * Uses HMAC-SHA256 for password hashing and opaque session tokens.
 *
 * In production you'd want:
 * - bcrypt/argon2 instead of HMAC (CPU-hard)
 * - Redis or DB-backed session store
 * - Refresh token rotation
 * - Rate limiting on login attempts
 *
 * This implementation is sufficient for local/self-hosted use
 * and can be swapped for OAuth/SSO later.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  lastLogin: number;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  userAgent?: string;
}

interface AuthConfig {
  secretKey: string;
  sessionTTL: number; // ms
  maxSessions: number;
}

export class AuthService {
  private users: Map<string, User> = new Map(); // id → User
  private emailIndex: Map<string, string> = new Map(); // email → userId
  private sessions: Map<string, Session> = new Map(); // token → Session
  private config: AuthConfig;

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = {
      secretKey: config.secretKey || process.env.UC_AUTH_SECRET || randomBytes(32).toString('hex'),
      sessionTTL: config.sessionTTL || 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSessions: config.maxSessions || 5,
    };
  }

  // ─── Registration ─────────────────────────────────────────────────────

  async register(email: string, password: string): Promise<{ user: Omit<User, 'passwordHash' | 'salt'>; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error('Email already registered');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const id = randomBytes(16).toString('hex');
    const salt = randomBytes(32).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const user: User = {
      id,
      email: normalizedEmail,
      passwordHash,
      salt,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    this.users.set(id, user);
    this.emailIndex.set(normalizedEmail, id);

    const token = this.createSession(id);

    return {
      user: { id, email: normalizedEmail, createdAt: user.createdAt, lastLogin: user.lastLogin },
      token,
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────

  async login(email: string, password: string, userAgent?: string): Promise<{ user: Omit<User, 'passwordHash' | 'salt'>; token: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = this.emailIndex.get(normalizedEmail);

    if (!userId) {
      throw new Error('Invalid email or password');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const hash = this.hashPassword(password, user.salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedBuffer = Buffer.from(user.passwordHash, 'hex');

    if (hashBuffer.length !== storedBuffer.length || !timingSafeEqual(hashBuffer, storedBuffer)) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = Date.now();

    const token = this.createSession(userId, userAgent);

    return {
      user: { id: user.id, email: user.email, createdAt: user.createdAt, lastLogin: user.lastLogin },
      token,
    };
  }

  // ─── Session Management ───────────────────────────────────────────────

  private createSession(userId: string, userAgent?: string): string {
    // Enforce max sessions per user
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => a.createdAt - b.createdAt);

    while (userSessions.length >= this.config.maxSessions) {
      const oldest = userSessions.shift();
      if (oldest) this.sessions.delete(oldest.token);
    }

    const token = randomBytes(48).toString('hex');
    const session: Session = {
      token,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTTL,
      userAgent,
    };

    this.sessions.set(token, session);
    return token;
  }

  validateSession(token: string): Session | null {
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  logoutAll(userId: string): void {
    for (const [token, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  // ─── User Lookup ──────────────────────────────────────────────────────

  getUserById(id: string): Omit<User, 'passwordHash' | 'salt'> | null {
    const user = this.users.get(id);
    if (!user) return null;
    return { id: user.id, email: user.email, createdAt: user.createdAt, lastLogin: user.lastLogin };
  }

  getUserByEmail(email: string): Omit<User, 'passwordHash' | 'salt'> | null {
    const userId = this.emailIndex.get(email.toLowerCase().trim());
    if (!userId) return null;
    return this.getUserById(userId);
  }

  // ─── Password Hashing ────────────────────────────────────────────────

  private hashPassword(password: string, salt: string): string {
    return createHmac('sha256', this.config.secretKey)
      .update(salt + password)
      .digest('hex');
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────

  cleanupExpiredSessions(): number {
    let removed = 0;
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
        removed++;
      }
    }
    return removed;
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let authService: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

// ─── Express Middleware ───────────────────────────────────────────────────────

/**
 * Auth middleware that extracts and validates the session token.
 * Sets req.userId and req.session if authenticated.
 * Returns 401 if no valid token found.
 */
export function requireAuth(req: any, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Include Bearer token in Authorization header.' });
    return;
  }

  const auth = getAuthService();
  const session = auth.validateSession(token);

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
    return;
  }

  req.userId = session.userId;
  req.session = session;
  next();
}

/**
 * Optional auth middleware — sets req.userId if token is present but
 * doesn't reject unauthenticated requests. Uses 'default' as fallback userId.
 */
export function optionalAuth(req: any, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (token) {
    const auth = getAuthService();
    const session = auth.validateSession(token);
    if (session) {
      req.userId = session.userId;
      req.session = session;
    }
  }

  if (!req.userId) {
    req.userId = 'default';
  }

  next();
}
