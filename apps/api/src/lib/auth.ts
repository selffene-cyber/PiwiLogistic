import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import type { JWTPayload } from '../types';

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): string {
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: REFRESH_EXPIRY });
}

export function verifyToken(token: string, secret: string): JWTPayload {
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
}