import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ChunkLoadRecovery } from '@/components/chunk-load-recovery';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/store/auth-provider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Civil Servant Management System',
  description: 'Employee Management System for Civil Service Commission',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
          <ChunkLoadRecovery />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
