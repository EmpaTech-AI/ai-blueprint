import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getAllUsers, createUser, deleteUser, updatePassword, getUserById, getUserByEmail } from '../storage/userStore';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/users', requireAdmin, (_req: Request, res: Response) => {
  res.json(getAllUsers());
});

router.post('/users', requireAdmin, async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    name?: string;
  };
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }
  if (role !== 'admin' && role !== 'client') {
    res.status(400).json({ error: 'role must be "admin" or "client".' });
    return;
  }
  if (getUserByEmail(email)) {
    res.status(409).json({ error: 'A user with that email already exists.' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ email: email.trim().toLowerCase(), passwordHash, role, name });
  res.status(201).json(user);
});

router.delete('/users/:userId', requireAdmin, (req: Request, res: Response) => {
  const user = getUserById(req.params.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  deleteUser(req.params.userId);
  res.json({ success: true });
});

router.post('/users/:userId/change-password', requireAdmin, async (req: Request, res: Response) => {
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'newPassword must be at least 8 characters.' });
    return;
  }
  const user = getUserById(req.params.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const hash = await bcrypt.hash(newPassword, 10);
  updatePassword(req.params.userId, hash);
  res.json({ success: true });
});

export default router;
