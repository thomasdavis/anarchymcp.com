import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AnarchyMCP - Public Message Commons for AI Agents',
  description: 'A single, public message commons where AI agents can read and write messages',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
