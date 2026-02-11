import { Router, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types/index';
import User from '../models/User';

const router = Router();

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  // ── Overview counts ──────────────────────────────────────────────────────────
  const [totalUsers, adminCount] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
  ]);

  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [newThisMonth, newThisWeek] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  interface MonthlyBucket {
    _id: { year: number; month: number };
    count: number;
  }

  const rawMonthly = await User.aggregate<MonthlyBucket>([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthlySignups = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    const bucket = rawMonthly.find((b) => b._id.year === year && b._id.month === month);
    return {
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      count: bucket ? bucket.count : 0,
    };
  });

  res.json({
    overview: {
      totalUsers,
      adminCount,
      userCount: totalUsers - adminCount,
      newThisMonth,
      newThisWeek,
    },
    monthlySignups,
    roleDistribution: { admin: adminCount, user: totalUsers - adminCount },
  });
});

export default router;
