export type LngLat = [number, number];

/** Tọa độ các kho (lng, lat) - dùng cho bản đồ giả lập giao hàng. */
export const WAREHOUSE_COORDS: Record<string, LngLat> = {
  "KHO-HCM": [106.6602, 10.7626],
  "KHO-HN": [105.8342, 21.0278],
  "KHO-DN": [108.2022, 16.0544],
  "KHO-CT": [105.7469, 10.0452],
};

export const DEFAULT_CENTER: LngLat = [106.6602, 10.7626];

/**
 * Geocode địa chỉ NCC qua Photon (Komoot, free không key, CORS mở),
 * cache localStorage. (Nominatim/OSM tile chặn mạng VN nên không dùng.)
 */
export async function geocodeAddress(address: string): Promise<LngLat | null> {
  const key = `geo:${address.trim().toLowerCase()}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length === 2) return parsed as LngLat;
    }
  } catch {
    // Bỏ qua lỗi đọc cache
  }
  try {
    const url =
      `https://photon.komoot.io/api/?limit=1&q=` + encodeURIComponent(`${address}, Vietnam`);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const point: LngLat = [Number(coords[0]), Number(coords[1])];
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    try {
      localStorage.setItem(key, JSON.stringify(point));
    } catch {
      // Bỏ qua lỗi ghi cache
    }
    return point;
  } catch {
    return null;
  }
}

/** Lộ trình lái xe qua OSRM demo; rớt thì trả đường thẳng. */
export async function fetchRoute(from: LngLat, to: LngLat): Promise<LngLat[]> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("osrm failed");
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) return coords as LngLat[];
  } catch {
    // Rớt OSRM thì dùng đường thẳng
  }
  return [from, to];
}

/** Nội suy vị trí theo quãng đường (fraction 0..1) trên tuyến. */
export function pointAlongRoute(route: LngLat[], fraction: number): LngLat {
  if (route.length === 0) return DEFAULT_CENTER;
  if (route.length === 1 || fraction <= 0) return route[0];
  if (fraction >= 1) return route[route.length - 1];
  // Tính theo độ dài từng đoạn cho đều tốc
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dx = route[i][0] - route[i - 1][0];
    const dy = route[i][1] - route[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLens.push(len);
    total += len;
  }
  if (total === 0) return route[0];
  let target = total * fraction;
  for (let i = 1; i < route.length; i++) {
    if (target <= segLens[i - 1]) {
      const t = segLens[i - 1] === 0 ? 0 : target / segLens[i - 1];
      return [
        route[i - 1][0] + (route[i][0] - route[i - 1][0]) * t,
        route[i - 1][1] + (route[i][1] - route[i - 1][1]) * t,
      ];
    }
    target -= segLens[i - 1];
  }
  return route[route.length - 1];
}
