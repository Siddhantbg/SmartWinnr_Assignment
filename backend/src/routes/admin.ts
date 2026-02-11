import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types/index';

const router = Router();

router.use(authenticate, requireAdmin);


router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, role, name } = req.body as {
    email?: string;
    password?: string;
    role?: 'admin' | 'user';
    name?: string;
  };

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(409).json({ message: 'A user with this email already exists.' });
      return;
    }

    const user = await User.create({
      email,
      password,
      role: role ?? 'user',
      name: name ?? '',
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params['id']);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

router.patch('/users/:id/role', async (req: AuthRequest, res: Response): Promise<void> => {
  const { role } = req.body as { role?: string };

  if (role !== 'admin' && role !== 'user') {
    res.status(400).json({ message: 'Role must be "admin" or "user".' });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params['id'],
      { role },
      { new: true, select: '-password' },
    );

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
