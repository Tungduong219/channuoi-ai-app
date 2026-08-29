import './globals.css';

export const metadata = {
  title: 'ChănNuôi AI — Cùng bạn chăn nuôi',
  description: 'Ứng dụng trợ lý chăn nuôi gia cầm thông minh tích hợp AI cho nông dân Việt Nam',
  manifest: '/manifest.json',
};

// Next.js 14.2 Viewport Export (Accessible WCAG 1.4.4 - Allows Pinch to Zoom)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00695C',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F0FAF9] text-[#1A2332] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
