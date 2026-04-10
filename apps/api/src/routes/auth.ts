import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { Env, JWTPayload } from '../types';
import { getDb } from '../lib/db';
import * as schema from '../../../../packages/db/src';
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyToken } from '../lib/auth';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

app.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  const { email, password } = parsed.data;
  const db = getDb(c.env.DB);

  const result = await db.select({
    user: schema.users,
    role: schema.roles,
  }).from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(and(eq(schema.users.email, email), eq(schema.users.activo, true)))
    .get();

  if (!result?.user || !result?.role) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, result.user.passwordHash);
  if (!valid) {
    return c.json({ success: false, error: 'Invalid credentials' }, 401);
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: result.user.id,
    tenantId: result.user.tenantId,
    roleId: result.user.roleId,
    roleCode: result.role.codigo,
    email: result.user.email,
  };

  const accessToken = signAccessToken(payload, c.env.JWT_SECRET);
  const refreshToken = signRefreshToken(payload, c.env.JWT_SECRET);

  const { passwordHash, ...userSafe } = result.user;

  return c.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { ...userSafe, role: result.role },
    },
  });
});

app.post('/refresh', async (c) => {
  const body = await c.req.json();
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors.map((e) => e.message).join(', ') }, 400);
  }

  try {
    const payload = verifyToken(parsed.data.refreshToken, c.env.JWT_SECRET);
    const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleCode: payload.roleCode,
      email: payload.email,
    };
    const accessToken = signAccessToken(newPayload, c.env.JWT_SECRET);
    return c.json({ success: true, data: { accessToken } });
  } catch {
    return c.json({ success: false, error: 'Invalid or expired refresh token' }, 401);
  }
});

app.post('/logout', async (c) => {
  return c.json({ success: true });
});

app.get('/me', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const result = await db.select({
    user: schema.users,
    role: schema.roles,
  }).from(schema.users)
    .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
    .where(eq(schema.users.id, payload.sub))
    .get();

  if (!result?.user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const { passwordHash, ...userSafe } = result.user;

  return c.json({
    success: true,
    data: { ...userSafe, role: result.role },
  });
});

export default app;