import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SGU MCP Server',
  description: 'MCP server for SGU (Sveriges Geologiska Undersökning) geological data API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
