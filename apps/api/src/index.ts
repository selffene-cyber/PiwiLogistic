import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq } from 'drizzle-orm';
import type { Env, JWTPayload } from './types';
import { authMiddleware } from './middleware/auth';
import { getDb } from './lib/db';
import * as schema from '../../../packages/db/src';
import authRoutes from './routes/auth';
import tenantsRoutes from './routes/tenants';
import usersRoutes from './routes/users';
import trucksRoutes from './routes/trucks';
import workersRoutes from './routes/workers';
import clientsRoutes from './routes/clients';
import boxTypesRoutes from './routes/box-types';
import routesRoutes from './routes/routes';
import dispatchGuidesRoutes from './routes/dispatch-guides';
import deliveriesRoutes from './routes/deliveries';
import bonusesRoutes from './routes/bonuses';
import dashboardRoutes from './routes/dashboard';
import fuelLoadRoutes from './routes/fuel-loads';
import maintenanceRoutes from './routes/maintenance';
import distributionCentersRoutes from './routes/distribution-centers';
import operationsDashboardRoutes from './routes/operations-dashboard';

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

app.use('/*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:8788',
      'https://piwi-logistic.pages.dev',
      'https://logistic.piwisuite.cl',
    ];
    if (!origin || allowed.includes(origin)) return origin || '';
    return '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/api/auth', authRoutes);

app.use('/api/*', authMiddleware);

app.get('/api/auth/me', async (c) => {
  const payload = c.get('jwtPayload') as JWTPayload;
  const db = getDb(c.env.DB);

  const user = await db.select().from(schema.users)
    .where(eq(schema.users.id, payload.sub))
    .get();

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  const role = user.roleId ? await db.select().from(schema.roles)
    .where(eq(schema.roles.id, user.roleId))
    .get() : null;

  const { passwordHash, ...userSafe } = user;

  return c.json({
    success: true,
    data: { ...userSafe, role },
  });
});

app.route('/api/tenants', tenantsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/trucks', trucksRoutes);
app.route('/api/workers', workersRoutes);
app.route('/api/clients', clientsRoutes);
app.route('/api/box-types', boxTypesRoutes);
app.route('/api/routes', routesRoutes);
app.route('/api/dispatch-guides', dispatchGuidesRoutes);
app.route('/api/deliveries', deliveriesRoutes);
app.route('/api/bonuses', bonusesRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/fuel-loads', fuelLoadRoutes);
app.route('/api/maintenance', maintenanceRoutes);
app.route('/api/distribution-centers', distributionCentersRoutes);
app.route('/api/operations-dashboard', operationsDashboardRoutes);

app.onError((err, c) => {
  console.error('API Error:', err.message);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;