export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface JWTPayload {
  sub: string;
  tenantId: string;
  roleId: string;
  roleCode: string;
  email: string;
  iat?: number;
  exp?: number;
}