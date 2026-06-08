'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldIcon, UserIcon, LockIcon, SpinnerIcon, ArrowRightIcon } from '@/components/ui/icons';
import { setClientToken, setAdminToken, getClientToken, getAdminToken, validateToken } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState('');
  const [checking,    setChecking]    = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Redirect if already logged in
  useEffect(() => {
    async function check() {
      const clientToken = getClientToken();
      if (clientToken) {
        const user = await validateToken(apiUrl, clientToken);
        if (user?.role === 'client') { router.replace('/dashboard'); return; }
      }
      const adminToken = getAdminToken();
      if (adminToken) {
        const user = await validateToken(apiUrl, adminToken);
        if (user?.role === 'admin') { router.replace('/admin'); return; }
      }
      setChecking(false);
    }
    check();
  }, [apiUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error || 'Login failed. Please check your credentials.');
        return;
      }
      const data = await res.json() as { token: string; user: { role: string } };
      if (data.user.role === 'admin') {
        setAdminToken(data.token);
        router.push('/admin');
      } else {
        setClientToken(data.token);
        router.push('/dashboard');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(99,102,241,0.5)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      {/* Background orb */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" aria-hidden="true"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.png" alt="AI Assist BG" width={44} height={44} className="transition-transform duration-200 group-hover:scale-105" />
            <span className="font-bold text-white text-lg tracking-tight">AI Assist BG</span>
          </Link>
        </div>

        <div className="gradient-border-wrap">
          <div className="glass-card p-8">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                <ShieldIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg leading-none">Sign in</h1>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>AI Value Blueprint portal</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Email address
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="email"
                    className="input-glass w-full"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Password
                </label>
                <div className="relative">
                  <LockIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="password"
                    className="input-glass w-full"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm px-1" style={{ color: '#fca5a5' }}>{error}</p>
              )}

              <button type="submit" disabled={isLoading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed" style={{ marginTop: '4px' }}>
                {isLoading
                  ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Signing in…</>
                  : <>Sign In <ArrowRightIcon className="w-4 h-4" /></>}
              </button>
            </form>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Don&apos;t have an account?{' '}
              <Link href="/intake" className="underline" style={{ color: 'rgba(165,180,252,0.7)' }}>
                Submit your Blueprint intake
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
