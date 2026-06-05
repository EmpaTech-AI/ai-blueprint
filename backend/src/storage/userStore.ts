import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { User } from '../types/pipeline';

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    name TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL
  )
`);

export type SafeUser = Omit<User, 'passwordHash'>;

export function createUser(data: {
  email: string;
  passwordHash: string;
  role: 'admin' | 'client';
  name: string;
}): SafeUser {
  const user: User = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO users (id, email, passwordHash, role, name, createdAt)
     VALUES (@id, @email, @passwordHash, @role, @name, @createdAt)`,
  ).run(user);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as User | undefined;
}

export function getUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getAllUsers(): SafeUser[] {
  return db
    .prepare('SELECT id, email, role, name, createdAt FROM users ORDER BY createdAt DESC')
    .all() as SafeUser[];
}

export function updatePassword(userId: string, passwordHash: string): void {
  db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, userId);
}

export function deleteUser(userId: string): void {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function countAdmins(): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .get() as { count: number };
  return row.count;
}
