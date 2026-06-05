const CLIENT_TOKEN_KEY = 'blueprint_client_token';
const ADMIN_TOKEN_KEY  = 'blueprint_admin_token';

export function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}
export function setClientToken(token: string): void {
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
}
export function clearClientToken(): void {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}
export function clientAuthHeaders(): Record<string, string> {
  const t = getClientToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
export function adminAuthHeaders(): Record<string, string> {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'client';
  name: string;
}

export async function validateToken(apiUrl: string, token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json() as AuthUser;
  } catch {
    return null;
  }
}
