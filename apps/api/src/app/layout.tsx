import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ResortOS API Engine',
  description: 'Backend REST API engine powering ResortOS luxury hospitality management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
