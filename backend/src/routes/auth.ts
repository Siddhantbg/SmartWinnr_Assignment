import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate } from '../middleware/auth';
import { AuthRequest, JwtPayload } from '../types/index';

const router = Router();

function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env['JWT_EXPIRES_IN'] ?? '7d') as
    | `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`
    | number;
  return jwt.sign(payload, process.env['JWT_SECRET'] as string, { expiresIn });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters.' });
    return;
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists.' });
      return;
    }

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name: name?.trim() ?? '',
      role: 'user',
    });

    const payload: JwtPayload = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: (user.createdAt as Date).toISOString(),
    };

    res.status(201).json({ token: signToken(payload), user: payload });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const payload: JwtPayload = {
      id: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: (user.createdAt as Date).toISOString(),
    };

    res.status(200).json({ token: signToken(payload), user: payload });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
