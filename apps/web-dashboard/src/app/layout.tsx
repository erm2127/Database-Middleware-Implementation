// apps/web-dashboard/src/app/layout.tsx
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider } from 'next-themes';

import './globals.css';

// Initialize font with optimized settings
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Enhanced metadata with Open Graph and Twitter cards
export const metadata: Metadata = {
  title: {
    default: 'API Request Dashboard',
    template: '%s | API Request Dashboard',
  },
  description: 'Real-time monitoring and analytics for API requests with advanced filtering and sorting capabilities.',
  openGraph: {
    title: 'API Request Dashboard',
    description: 'Monitor and analyze API requests with a modern, responsive dashboard.',
    url: 'https://your-domain.com',
    siteName: 'API Dashboard',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'API Request Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Request Dashboard',
    description: 'Monitor and analyze API requests with a modern, responsive dashboard.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL('https://your-domain.com'),
  alternates: {
    canonical: '/',
  },
};

// Component
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" site.webmanifest" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="min-h-screen">
            {children}
          </main>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
