import type { Context, Next } from 'hono';
import type { Env, JWTPayload } from '../types';
import { verifyToken } from '../lib/auth';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const path = new URL(c.req.url).pathname;
  if (path === '/api/health' || path.startsWith('/api/auth/')) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyToken(token, c.env.JWT_SECRET);
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}

export function requireRole(...roles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    if (!payload) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    if (!roles.includes(payload.roleCode)) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }
    await next();
  };
}