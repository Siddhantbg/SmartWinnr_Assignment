import { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
  createdAt?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
