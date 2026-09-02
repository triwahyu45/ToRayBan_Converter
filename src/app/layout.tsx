import type { Metadata, Viewport } from 'next';
import './globals.css';
import CyberBackground from '@/components/layout/CyberBackground';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'ToRayBan_Converter | Ray-Ban Meta Smart Glasses Media Converter',
  description:
    'Client-side web application converting photos and videos into authentic Ray-Ban Meta Smart Glasses format (1376x1840 vertical resolution, QuickTime .MOV atom container with Instagram Spin View metadata injection, and EXIF camera tags).',
  keywords: [
    'Ray-Ban Meta',
    'Instagram Spin View',
    'Smart Glasses',
    '1376x1840',
    'QuickTime MOV',
    'EXIF Injector',
    'Luxottica',
    'Meta View',
    'Client-Side Converter',
  ],
  authors: [{ name: 'ToRayBan_Converter Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#050608',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#050608] text-slate-100 min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col font-sans relative overflow-x-hidden">
        <ToastProvider>
          <CyberBackground />
          <div className="relative z-10 flex flex-col min-h-screen">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
