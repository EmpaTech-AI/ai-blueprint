import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Value Blueprint — AI Assist BG',
  description: 'Get a personalised AI Value Blueprint for your business. Identify where AI can create the most value, fast.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
