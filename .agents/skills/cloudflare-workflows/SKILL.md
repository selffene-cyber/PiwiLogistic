---
name: cloudflare-workflows
description: Use when building, deploying, or managing applications on Cloudflare's platform — including Workers, Pages, D1 databases, R2 storage, Durable Objects, and KV. Invoke for Cloudflare configuration, wrangler setup, D1 migrations, R2 bucket management, Pages deployment, and edge computing patterns.
license: MIT
metadata:
  author: PiwiLogistic
  version: "1.0.0"
  domain: cloud-infra
  triggers: cloudflare, workers, pages, D1, R2, wrangler, edge, deploy, KV, durable objects
  role: specialist
  scope: implementation
  output-format: code
  related-skills: fullstack-developer, secure-code-guardian
---

# Cloudflare Workflows

## Core Workflow

1. **Configure** — Set up wrangler.toml, bindings, and environment variables
2. **Develop** — Build Workers/Pages applications with D1, R2, KV bindings
3. **Migrate** — Create and apply D1 database migrations
4. **Test** — Validate locally with wrangler dev before deployment
5. **Deploy** — Ship to Cloudflare's edge network

### Validation Checkpoints

After each implementation step, verify:

- **Bindings**: All D1/R2/KV bindings in wrangler.toml match Worker code
- **Migrations**: D1 migrations run cleanly (`wrangler d1 migrations apply`)
- **CORS**: Proper headers for API responses consumed by frontend
- **Environment**: Dev/production environment variables correctly separated
- **Limits**: Respect Worker execution time (10ms free / 30s paid) and D1 query limits

## Reference Guide

| Topic | Documentation | Use When |
|-------|---------------|----------|
| Workers | https://developers.cloudflare.com/workers/ | Building API endpoints |
| Pages | https://developers.cloudflare.com/pages/ | Deploying frontend apps |
| D1 | https://developers.cloudflare.com/d1/ | SQLite database at the edge |
| R2 | https://developers.cloudflare.com/r2/ | Object storage (S3-compatible) |
| KV | https://developers.cloudflare.com/kv/ | Key-value storage, caching |
| Wrangler | https://developers.cloudflare.com/workers/wrangler/ | CLI for development and deploy |
| Durable Objects | https://developers.cloudflare.com/durable-objects/ | Stateful compute at the edge |

## Project Structure

```
project/
├── frontend/              # React + Vite (Cloudflare Pages)
│   ├── public/
│   │   └── manifest.json # PWA manifest
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── wrangler.toml      # Pages config
├── backend/               # Hono/Express API (Cloudflare Workers)
│   ├── src/
│   │   ├── index.ts       # Worker entry point
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── db/
│   │       ├── schema.ts  # Drizzle schema
│   │       └── migrations/
│   ├── wrangler.toml      # Worker config
│   ├── package.json
│   └── tsconfig.json
└── shared/                # Shared types/utils
    └── types.ts
```

## wrangler.toml Configuration

### Worker (Backend API)

```toml
name = "piwi-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "piwi-logistic-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "piwi-documents"

[vars]
ENVIRONMENT = "production"

[env.development]
name = "piwi-api-dev"
[env.development.vars]
ENVIRONMENT = "development"

[[env.development.d1_databases]]
binding = "DB"
database_name = "piwi-logistic-db-dev"
database_id = "your-dev-database-id"
```

### Pages (Frontend)

```toml
name = "piwi-frontend"
compatibility_date = "2024-12-01"
pages_build_output_dir = "./dist"

[env.production]
[env.production.vars]
VITE_API_URL = "https://piwi-api.your-domain.workers.dev"

[env.preview]
[env.preview.vars]
VITE_API_URL = "https://piwi-api-dev.your-domain.workers.dev"
```

## D1 with Drizzle ORM

### Schema Definition (SQLite / D1 dialect)

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  nombre: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rolId: text('rol_id').references(() => roles.id),
  activo: integer('activo', { mode: 'boolean' }).default(true),
});
```

### Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations to local D1
npx wrangler d1 migrations apply piwi-logistic-db --local

# Apply migrations to remote D1
npx wrangler d1 migrations apply piwi-logistic-db --remote
```

### Query with Drizzle + D1

```typescript
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';

export interface Env {
  DB: D1Database;
}

app.get('/api/rutas/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const ruta = await db.select().from(rutas).where(
    and(eq(rutas.id, c.req.param('id')), eq(rutas.tenantId, tenantId))
  ).get();
  return c.json(ruta);
});
```

## Hono API on Workers

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors({
  origin: ['https://piwi.pages.dev', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('/api/*', jwt({ secret: c.env.JWT_SECRET }));

app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
```

## R2 File Storage (Future)

```typescript
app.post('/api/upload', async (c) => {
  const bucket = c.env.STORAGE;
  const body = await c.req.parseBody();
  const file = body.file as File;

  await bucket.put(`${tenantId}/${file.name}`, file.stream());

  return c.json({ key: `${tenantId}/${file.name}` });
});

app.get('/api/files/:key', async (c) => {
  const object = await c.env.STORAGE.get(c.req.param('key'));
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' },
  });
});
```

## Deployment Commands

```bash
# Deploy Worker (backend)
npx wrangler deploy

# Deploy Pages (frontend)
npx wrangler pages deploy ./dist

# View Worker logs
npx wrangler tail piwi-api

# D1 console
npx wrangler d1 execute piwi-logistic-db --command="SELECT * FROM rutas LIMIT 10"
```

## Constraints

### MUST DO
- Use SQLite dialect for D1 (not PostgreSQL)
- Include tenant_id filter on ALL queries
- Set CORS headers for Pages <-> Workers communication
- Use `--local` flag for development D1 operations
- Handle Worker size limits (1MB free / 10MB paid)
- Use bindings for DB connections (not connection strings)

### MUST NOT DO
- Use PostgreSQL-specific SQL features with D1
- Store secrets directly in wrangler.toml (use `wrangler secret put`)
- Skip migrations (always use Drizzle migration files)
- Use `wrangler d1 execute` for schema changes in production (use migrations)
- Ignore D1's 10MB per database limit on free plan

## Common Patterns

### Multi-tenant Query Filter

```typescript
function withTenant<T extends { tenantId: string }>(query: T, tenantId: string) {
  return { ...query, tenantId };
}
```

### Error Handling for Workers

```typescript
app.onError((err, c) => {
  console.error('Worker error:', err.message);
  return c.json({ error: 'Internal server error' }, 500);
});
```

### Environment-based Config

```typescript
const isDev = c.env.ENVIRONMENT === 'development';
const db = drizzle(c.env.DB, { logger: isDev });
```

## Output Templates

When implementing Cloudflare features, provide:
1. wrangler.toml configuration with all bindings
2. Worker/Hono entry point with typed bindings
3. D1 migration files for schema changes
4. Deployment and rollback commands
5. Environment variable setup instructions

## Knowledge Reference

Cloudflare Workers, Pages, D1 (SQLite), R2, KV, Wrangler CLI, Drizzle ORM, Hono, Edge Computing, Service Workers, PWA on Edge