import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GeoData Hub — Polska Platforma Informacji Przestrzennej',
  description: 'Zintegrowana platforma informacji przestrzennej, drogowej, meteorologicznej i środowiskowej dla Polski.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="dark">
      <body className="h-screen w-screen overflow-hidden flex flex-col antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

