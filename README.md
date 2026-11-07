# 🛰️ GeoData Hub — Krajowa Platforma Informacji Przestrzennej

Nowoczesna, zintegrowana platforma GIS integrująca ogólnodostępne dane przestrzenne, drogowe, meteorologiczne, środowiskowe i hydrologiczne w jednym interaktywnym środowisku mapowym.

Architektura zoptymalizowana pod **Vercel Edge / Serverless** bez konieczności konfigurowania i utrzymywania zewnętrznych, skomplikowanych baz danych.

---

## 🛠️ Stack Technologiczny

* **Framework:** [Next.js 15 (App Router)](https://nextjs.org/) + React 19 + TypeScript
* **Stylowanie:** Tailwind CSS (Motyw Tactical Dark GIS)
* **Baza & Magazyn danych:** [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob) (`@vercel/blob`) – zero konfiguracji zewnętrznych baz
* **Silnik mapowy:** [MapLibre GL JS](https://maplibre.org/) z klastrowaniem punktów na GPU/WebGL
* **Podkład mapowy:** OpenFreeMap Dark (w 100% darmowy, wektorowy, bez API key)
* **Wizualizacje & Wykresy:** [Apache ECharts](https://echarts.apache.org/) (`echarts-for-react`)
* **Architektura agregacji:** Modułowe adaptery ze znormalizowanym modelem `GeoEvent`
* **Walidacja danych:** Zod
* **Caching & Wydajność:** In-memory TTL Cache / Edge Cache (ochrona przed przekraczaniem limitów zewnętrznych API)
* **Hosting:** Vercel

---

## 📡 Zintegrowane Źródła Danych

| Źródło | Kategoria | Status | Opis |
| :--- | :--- | :--- | :--- |
| **Sieć Ruchu Drogowego (OSRM)** | Ruch i Tranzyt | `ACTIVE` | Monitorowanie natężenia ruchu autostrad (A1, A2, A4), dróg ekspresowych (S3, S5, S7, S8, S17, A8), DK oraz aglomeracji miejskich (Warszawa, Śląsk, Kraków, Wrocław, Poznań, Trójmiasto, Łódź) |
| **Roboty drogowe (OSM)** | Drogi | `ACTIVE` | 534 rzeczywiste lokalizacje remontów, przebudów węzłów i zwężeń w Polsce |
| **IMGW PIB (Synoptyczne)** | Pogoda | `ACTIVE` | Stacje synoptyczne w całej Polsce (temperatura, wiatr, opady, ciśnienie, wilgotność) |
| **IMGW PIB (Hydrologia)** | Hydrologia | `ACTIVE` | Ponad 900 stacji wodowskazowych z poziomami wód oraz alertami stanów ostrzegawczych i alarmowych |
| **IMGW PIB (Ostrzeżenia)** | Zagrożenia | `ACTIVE` | Bieżące ostrzeżenia meteorologiczne i hydrologiczne |
| **GIOŚ PJP** | Środowisko | `ACTIVE` | Oficjalny Portal Jakości Powietrza (stacje pomiarowe + indeksy jakości powietrza) |
| **OpenStreetMap & CANARD** | Bezpieczeństwo | `ACTIVE` | 2282 fotoradarów stacjonarnych oraz strefy Odcinkowego Pomiaru Prędkości (OPP) z trasami |
| **Open-Meteo** | Prognozy | `ACTIVE` | Prognozy pogodowe i wskaźniki zagrożeń dla głównych aglomeracji |
| **GDDKiA / KPD (Datex II)** | Drogi | `NOT_CONFIGURED` | Przygotowany adapter ze statusem konfiguracyjnym pod klucz KPD |
| **Silnik Korelacyjny AI** | Bezpieczeństwo | `ACTIVE` | Automatyczne wnioskowanie (np. ryzyko gołoledzi / porywistego wiatru / fali wezbraniowej) |

---

## 🚀 Szybki start

### 1. Klonowanie i instalacja zależności
```bash
git clone https://github.com/TrafficMMISSIONcontrol/trafficmmissioncontrol.github.io.git
cd PMS.github.io
npm install
```

### 2. Konfiguracja zmiennych środowiskowych
Skopiuj plik `.env.example` do `.env.local`:
```bash
cp .env.example .env.local
```
Uzupełnij token Vercel Blob:
```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
BLOB_STORE_ID="store_..."
```

### 3. Uruchomienie lokalnego serwera deweloperskiego
```bash
npm run dev
```
Aplikacja będzie dostępna pod adresem: `http://localhost:3000`.

### 4. Budowanie produkcyjne
```bash
npm run build
npm run start
```

---

## 🌐 Endpointy API

* `GET /api/events` – Agregacja wszystkich zdarzeń przestrzennych z aktywnych adapterów + wnioski korelacyjne
* `GET /api/traffic` – Dane wektorowe GeoJSON o natężeniu ruchu drogowego wraz ze statystykami sieci
* `GET /api/sources` – Statusy diagnostyczne zarejestrowanych adapterów
* `GET /api/gios-index?stationId={id}` – Indeks jakości powietrza dla wybranej stacji GIOŚ
* `GET /api/snapshot` – Odczyt ostatniego zapisanego zrzutu danych z Vercel Blob
* `POST /api/snapshot` – Wymuszenie synchronizacji i zapis zrzutu danych do Vercel Blob (obsługiwany przez cron `vercel.json`)
