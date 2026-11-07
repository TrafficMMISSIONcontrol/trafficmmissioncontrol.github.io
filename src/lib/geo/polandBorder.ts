// Uproszczony obrys granic Polski (współrzędne [szerokość lat, długość lon])
// Pozwala błyskawicznie sprawdzić czy punkt leży wewnątrz terytorium RP
const POLAND_BORDER_POLYGON: [number, number][] = [
  [54.44, 18.57], // Trójmiasto / Zatoka
  [54.55, 19.65], // Mierzeja Wiślana (granica z Rosją)
  [54.36, 22.79], // Trójstyk PL-RU-LT (Wiżajny)
  [54.10, 23.55], // Granica PL-LT
  [53.95, 23.51], // Trójstyk PL-LT-BY
  [53.25, 23.95], // Puszcza Białowieska
  [52.12, 23.18], // Brześć / Terespol
  [51.50, 23.62], // Granica Bug
  [50.28, 24.15], // Bełz / Hrubieszów
  [49.00, 22.70], // Bieszczady (Otryt/Krzemieniec)
  [49.40, 21.00], // Beskid Niski
  [49.19, 20.08], // Rysy (Tatry)
  [49.50, 18.85], // Trójstyk PL-CZ-SK
  [49.95, 18.30], // Racibórz / Ostrawa
  [50.25, 17.50], // Głubczyce
  [50.45, 16.20], // Ziemia Kłodzka
  [50.85, 15.40], // Karkonosze
  [50.90, 14.82], // Trójstyk Zittau (PL-DE-CZ)
  [51.50, 14.75], // Nysa Łużycka
  [52.05, 14.65], // Gubin
  [52.55, 14.55], // Kostrzyn nad Odrą
  [53.40, 14.35], // Szczecin zachód
  [53.90, 14.25], // Świnoujście
  [54.50, 16.80], // Ustka / Wybrzeże
  [54.83, 18.30], // Jastrzębia Góra (Przylądek Rozewie)
];

/**
 * Sprawdza czy dany punkt [lat, lon] znajduje się w obrębie granic Polski
 * Wykorzystuje wydajny algorytm Ray-Casting (O(n), czas < 1 mikrosekundy)
 */
export function isPointInPoland(lat: number, lon: number): boolean {
  // Szybki bounding-box check
  if (lat < 49.0 || lat > 54.85 || lon < 14.12 || lon > 24.15) {
    return false;
  }

  let inside = false;
  const poly = POLAND_BORDER_POLYGON;
  const n = poly.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];

    const intersect = yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

