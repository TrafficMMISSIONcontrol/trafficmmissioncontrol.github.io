import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
      <h2 className="text-2xl font-bold mb-2">404 - Nie znaleziono strony</h2>
      <p className="text-slate-400 mb-4 text-sm">Szukana strona lub zasób nie istnieje w portalu GeoData Hub.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded bg-sky-600 text-white hover:bg-sky-500 text-xs font-semibold transition-colors"
      >
        Wróć do mapy
      </Link>
    </div>
  );
}

