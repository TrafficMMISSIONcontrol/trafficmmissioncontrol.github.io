# 🛰️ GeoData Hub — Krajowa Platforma Informacji Przestrzennej

Nowoczesna, zintegrowana platforma GIS integrująca ogólnodostępne dane przestrzenne, drogowe, meteorologiczne, środowiskowe i hydrologiczne w jednym interaktywnym środowisku mapowym.

Architektura zoptymalizowana pod **Vercel Edge / Serverless** bez konieczności konfigurowania i utrzymywania zewnętrznych, skomplikowanych baz danych.

---

## ⚡ Stack Technologiczny

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

## 🌐 Zintegrowane Źródła Danych

| Źródło | Kategoria | Status | Opis |
| :--- | :--- | :--- | :--- |
| **IMGW PIB** | Pogoda | `ACTIVE` | Stacje synoptyczne w całej Polsce (temperatura, wiatr, opady, ciśnienie, wilgotność) |
| **GIOŚ PJP** | Środowisko | `ACTIVE` | Oficjalny Portal Jakości Powietrza (stacje pomiarowe + indeksy jakości powietrza) |
| **OpenStreetMap & CANARD** | Drogi | `ACTIVE` | Fotoradary stacjonarne oraz strefy Odcinkowego Pomiaru Prędkości (OPP) |
| **Open-Meteo** | Prognozy | `ACTIVE` | Prognozy pogodowe i wskaźniki zagrożeń dla głównych aglomeracji |
| **GDDKiA / KPD (Datex II)** | Drogi | `NOT_CONFIGURED` | Przygotowany adapter ze statusem konfiguracyjnym pod klucz KPD |
| **Silnik Korelacyjny** | Bezpieczeństwo | `ACTIVE` | Automatyczne wnioskowanie (np. ryzyko gołoledzi / porywistego wiatru) |

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

### 3. Uruchomienie deweloperskie
```bash
npm run dev
```
Otwórz przeglądarkę na [http://localhost:3000](http://localhost:3000).

### 4. Budowanie i wdrożenie na Vercel
```bash
npm run build
```
Projekt jest natychmiast gotowy do wdrożenia na Vercel (wystarczy połączyć repozytorium GitHub w panelu Vercela – zero konfiguracji baz danych).

---

## 🛡️ Zasada wiarygodności danych

W GeoData Hub:
* **Nie stosujemy generowania fikcyjnych wypadków ani losowych atrap pomiarów.**
* Każde źródło posiada jawny status (`ACTIVE`, `DEGRADED`, `NOT_CONFIGURED`).
* Każdy punkt posiada metadane pochodzenia (`source`), czas obserwacji (`observedAt`) oraz status weryfikacji (`CONFIRMED`, `OFFICIAL_WARNING`, `SYSTEM_INFERENCE`, `FORECAST`).
