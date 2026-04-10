import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, JWTPayload } from './types';
import { authMiddleware } from './middleware/auth';
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

const app = new Hono<{ Bindings: Env; Variables: { jwtPayload: JWTPayload } }>();

app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:8788'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.route('/api/auth', authRoutes);

app.use('/api/*', authMiddleware);

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

app.onError((err, c) => {
  console.error('API Error:', err.message);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

export default app;