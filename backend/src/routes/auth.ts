import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, updatePassword } from '../storage/userStore';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, name: user.name };
  const token = signToken(payload);
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const dbUser = getUserById(user.userId);
  if (!dbUser) { res.status(404).json({ error: 'User not found' }); return; }
  const { passwordHash: _, ...safe } = dbUser;
  res.json(safe);
});

router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters.' });
    return;
  }
  const dbUser = getUserById(user.userId);
  if (!dbUser) { res.status(404).json({ error: 'User not found' }); return; }
  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  updatePassword(user.userId, hash);
  res.json({ success: true });
});

export default router;
