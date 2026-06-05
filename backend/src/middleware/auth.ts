import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'admin' | 'client';
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production';
}

function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractAuth(req: Request): { payload: JwtPayload | null; isLegacy: boolean } {
  // 1. Authorization: Bearer header (primary)
  const authHeader = req.headers['authorization'] as string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    const payload = verifyJwt(authHeader.slice(7));
    if (payload) return { payload, isLegacy: false };
  }

  // 2. URL ?token= param (for download/preview links opened in new tabs)
  const queryToken = req.query.token as string | undefined;
  if (queryToken) {
    const payload = verifyJwt(queryToken);
    if (payload) return { payload, isLegacy: false };
    if (process.env.REVIEWER_SECRET_TOKEN && queryToken === process.env.REVIEWER_SECRET_TOKEN) {
      return { payload: null, isLegacy: true };
    }
  }

  // 3. x-reviewer-token header (legacy admin access)
  const legacyToken = req.headers['x-reviewer-token'] as string | undefined;
  if (legacyToken && process.env.REVIEWER_SECRET_TOKEN && legacyToken === process.env.REVIEWER_SECRET_TOKEN) {
    return { payload: null, isLegacy: true };
  }

  return { payload: null, isLegacy: false };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

// Middleware: allows JWT admin OR legacy REVIEWER_SECRET_TOKEN
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { payload, isLegacy } = extractAuth(req);
  if (isLegacy) {
    return next();
  }
  if (payload?.role === 'admin') {
    (req as AuthRequest).user = payload;
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Middleware: requires a valid JWT (any role)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { payload } = extractAuth(req);
  if (payload) {
    (req as AuthRequest).user = payload;
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Middleware: requires a valid JWT with client role
export function requireClient(req: Request, res: Response, next: NextFunction): void {
  const { payload } = extractAuth(req);
  if (payload?.role === 'client') {
    (req as AuthRequest).user = payload;
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}
