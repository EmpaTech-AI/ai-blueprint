import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GlassKit } from '@/components/ui/GlassKit';
import { ShaderBackground } from '@/components/ui/ShaderBackground';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'AI Value Blueprint — AI Assist BG',
  description: 'Get a personalised AI Value Blueprint for your business. Identify where AI can create the most value, fast.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {/* Fixed WebGL background — z-index 0, behind all page content */}
        <ShaderBackground />

        {/* Page content — z-index 1, floats above the shader canvas */}
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          {children}
        </div>

        {/* Liquid Glass interactive effects + toast region */}
        <GlassKit />
      </body>
    </html>
  );
}
