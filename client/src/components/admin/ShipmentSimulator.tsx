"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { config as maplibreConfig } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// MapLibre mặc định suy URL worker từ import.meta.url — dưới Next.js/Turbopack
// URL này không phải http(s) nên worker GeoJSON chết lặng (raster vẫn hiện,
// line/circle không bao giờ render). Trỏ thẳng vào file worker đã copy ra public/.
if (!maplibreConfig.WORKER_URL) {
  maplibreConfig.WORKER_URL = "/maplibre-gl-worker.mjs";
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  PackagePlus,
  MapPin,
} from "lucide-react";
import {
  WAREHOUSE_COORDS,
  DEFAULT_CENTER,
  geocodeAddress,
  fetchRoute,
  type LngLat,
} from "@/lib/geo";

type SimStatus = "idle" | "running" | "paused" | "done";

interface SimState {
  status: SimStatus;
  elapsedMs: number;
  durationMs: number;
}

interface RouteSlice {
  position: LngLat;
  done: LngLat[];
  rest: LngLat[];
}

const DURATIONS = [
  { value: 15000, label: "15 giây (demo nhanh)" },
  { value: 60000, label: "1 phút" },
  { value: 300000, label: "5 phút" },
];

const DEFAULT_DURATION_MS = 60000;
const STORAGE_WRITE_INTERVAL_MS = 1000;
const REACT_PROGRESS_INTERVAL_MS = 100;
const SERVER_PROGRESS_INTERVAL_MS = 3000;

const TRUCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;

function makeTruckEl(done: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = [
    "width:40px",
    "height:40px",
    "border-radius:12px",
    `background:${done ? "#16a34a" : "#ff4d00"}`,
    "display:grid",
    "place-items:center",
    "box-shadow:0 4px 12px rgba(0,0,0,.35)",
    "border:2px solid #fff",
    "will-change:transform",
  ].join(";");
  el.innerHTML = TRUCK_SVG;
  return el;
}

function makeEndpointEl(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText =
    "display:flex;flex-direction:column;align-items:center;pointer-events:none;";
  el.innerHTML =
    `<span data-role="lbl" style="background:rgba(0,0,0,0.75);color:#fff;font-size:10px;font-weight:700;` +
    `padding:2px 8px;border-radius:9999px;white-space:nowrap;margin-bottom:4px;box-shadow:0 2px 6px rgba(0,0,0,0.2);"></span>` +
    `<span style="width:12px;height:12px;border-radius:9999px;background:${color};` +
    `border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);flex-shrink:0;"></span>`;
  return el;
}

function shortLabel(name: string, max = 20): string {
  const t = (name || "").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m} ph ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

const EMPTY_ROUTE: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function routeFeature(coords: LngLat[]): GeoJSON.FeatureCollection {
  if (coords.length < 2) return EMPTY_ROUTE;

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coords,
        },
      },
    ],
  };
}

/**
 * Đảm bảo 2 line layer luôn tồn tại trước mọi setData().
 * Trả về false khi stylesheet chưa parse xong (gọi lại sau).
 *
 * LƯU Ý: cố tình KHÔNG dùng map.isStyleLoaded() ở đây — hàm đó còn đợi
 * raster tiles tải xong (Style.loaded() check từng tileManager), trong khi
 * addSource/addLayer chỉ cần stylesheet đã parse (sự kiện style.load).
 * Gating bằng isStyleLoaded() khiến line không bao giờ được tạo nếu tile
 * nền chậm/lỗi, dù marker HTML vẫn hiện bình thường.
 */
function ensureRouteLayers(
  map: maplibregl.Map,
  currentRoute: LngLat[],
): boolean {
  if (!map.getStyle()) return false;

  if (!map.getSource("route-rest")) {
    map.addSource("route-rest", {
      type: "geojson",
      data: routeFeature(currentRoute),
    });
  }

  if (!map.getLayer("route-rest")) {
    map.addLayer({
      id: "route-rest",
      type: "line",
      source: "route-rest",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#4f46e5",
        "line-width": 7,
        "line-opacity": 1,
      },
    });
  }

  if (!map.getSource("route-done")) {
    map.addSource("route-done", {
      type: "geojson",
      data: EMPTY_ROUTE,
    });
  }

  if (!map.getLayer("route-done")) {
    map.addLayer({
      id: "route-done",
      type: "line",
      source: "route-done",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#22c55e",
        "line-width": 8,
        "line-opacity": 1,
      },
    });
  }

  return true;
}

/**
 * Khoảng cách Haversine theo mét.
 * Dùng để xác định segment chính xác thay vì "vertex gần nhất".
 */
function distanceMeters(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLng = toRad(b[0] - a[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function interpolateLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  const x = Math.min(1, Math.max(0, t));
  return [
    a[0] + (b[0] - a[0]) * x,
    a[1] + (b[1] - a[1]) * x,
  ];
}

/**
 * Trả về vị trí hiện tại + route đã đi/còn lại theo đúng segment.
 * Không bị lỗi "line đi quá xe rồi quay lại" như cách tìm vertex gần nhất.
 */
function sliceRouteAtFraction(route: LngLat[], fraction: number): RouteSlice {
  if (route.length === 0) {
    return {
      position: DEFAULT_CENTER,
      done: [],
      rest: [],
    };
  }

  if (route.length === 1) {
    return {
      position: route[0],
      done: [route[0]],
      rest: [route[0]],
    };
  }

  const f = Math.min(1, Math.max(0, fraction));
  const segmentLengths: number[] = [];
  let total = 0;

  for (let i = 0; i < route.length - 1; i += 1) {
    const len = distanceMeters(route[i], route[i + 1]);
    segmentLengths.push(len);
    total += len;
  }

  if (total <= 0) {
    return {
      position: route[0],
      done: [route[0]],
      rest: [...route],
    };
  }

  if (f <= 0) {
    return {
      position: route[0],
      done: [],
      rest: [...route],
    };
  }

  if (f >= 1) {
    return {
      position: route[route.length - 1],
      done: [...route],
      rest: [],
    };
  }

  const target = total * f;
  let walked = 0;

  for (let i = 0; i < segmentLengths.length; i += 1) {
    const segLen = segmentLengths[i];
    const next = walked + segLen;

    if (target <= next || i === segmentLengths.length - 1) {
      const localT = segLen <= 0 ? 0 : (target - walked) / segLen;
      const cut = interpolateLngLat(route[i], route[i + 1], localT);

      return {
        position: cut,
        done: [...route.slice(0, i + 1), cut],
        rest: [cut, ...route.slice(i + 1)],
      };
    }

    walked = next;
  }

  return {
    position: route[route.length - 1],
    done: [...route],
    rest: [],
  };
}

/**
 * Giả lập chuyến xe giao hàng trên bản đồ thật (MapLibre + route backend/OSRM).
 *
 * - MapLibre chỉ chịu trách nhiệm hiển thị.
 * - Progress business logic không phụ thuộc việc map/style có load thành công hay không.
 * - requestAnimationFrame dùng cho marker/line để animation mượt.
 * - React state được cập nhật chậm hơn để tránh render 60 lần/giây.
 * - localStorage + server progress đều được throttle.
 */
export default function ShipmentSimulator({
  poId,
  poCode,
  supplierName,
  supplierAddress,
  warehouseName,
  warehouseCode,
  syncedProgress,
  onProgress,
  receiptHref,
}: {
  poId: string;
  poCode: string;
  supplierName: string;
  supplierAddress?: string;
  warehouseName: string;
  warehouseCode?: string;
  /** Tiến độ từ server (phía kia đẩy lên), % 0-100. */
  syncedProgress?: number | null;
  /** Gọi khi tiến độ đổi để đẩy lên server. */
  onProgress?: (progress: number, done: boolean) => void;
  /** Link tạo phiếu nhập khi xe tới. Null = ẩn nút. */
  receiptHref?: string | null;
}) {
  const resolvedReceiptHref =
    receiptHref === undefined
      ? `/admin/inventory/movements/new?purchaseOrderId=${poId}`
      : receiptHref;

  const storageKey = `shipment-sim:${poId}`;

  const [state, setState] = useState<SimState>({
    status: "idle",
    elapsedMs: 0,
    durationMs: DEFAULT_DURATION_MS,
  });
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState<LngLat[]>([]);
  const [routeNote, setRouteNote] = useState("");
  const [mapError, setMapError] = useState("");
  const [styleReady, setStyleReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const truckRef = useRef<maplibregl.Marker | null>(null);
  const startRef = useRef<maplibregl.Marker | null>(null);
  const endRef = useRef<maplibregl.Marker | null>(null);

  const routeRef = useRef<LngLat[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const startElapsedRef = useRef(0);
  const lastReactUpdateRef = useRef(0);
  const lastStorageWriteRef = useRef(0);
  const initialFollowDoneRef = useRef(false);

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const serverPushRef = useRef({
    time: 0,
    value: -1,
    stage: -1,
  });

  const progress =
    state.durationMs > 0
      ? Math.min(100, (state.elapsedMs / state.durationMs) * 100)
      : 0;

  const stage =
    state.status === "done" || progress >= 100 ? 2 : progress > 0 ? 1 : 0;

  const setEndpointLabels = (fromLabel: string, toLabel: string) => {
    const startEl = startRef.current?.getElement();
    const startLabel = startEl?.querySelector("[data-role='lbl']");
    if (startLabel) startLabel.textContent = fromLabel;

    const endEl = endRef.current?.getElement();
    const endLabel = endEl?.querySelector("[data-role='lbl']");
    if (endLabel) endLabel.textContent = toLabel;
  };

  const persistState = (next: SimState, force = false) => {
    if (!loaded) return;

    const now = Date.now();
    if (
      !force &&
      now - lastStorageWriteRef.current < STORAGE_WRITE_INTERVAL_MS
    ) {
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      lastStorageWriteRef.current = now;
    } catch {
      // Storage có thể bị chặn; simulation vẫn tiếp tục bình thường.
    }
  };

  const pushProgress = (
    value: number,
    done: boolean,
    currentStage: number,
    force = false,
  ) => {
    const cb = onProgressRef.current;
    if (!cb) return;

    const now = Date.now();
    const last = serverPushRef.current;
    const rounded = Math.round(Math.min(100, Math.max(0, value)));

    const shouldPush =
      force ||
      done ||
      currentStage !== last.stage ||
      (now - last.time >= SERVER_PROGRESS_INTERVAL_MS &&
        Math.abs(rounded - last.value) >= 1);

    if (!shouldPush) return;

    last.time = now;
    last.value = rounded;
    last.stage = currentStage;
    cb(rounded, done);
  };

  const updateVisuals = (fraction: number, followOnStart = false) => {
    const currentRoute = routeRef.current;
    if (currentRoute.length === 0) return;

    const map = mapRef.current;
    const sliced = sliceRouteAtFraction(currentRoute, fraction);

    if (truckRef.current) {
      truckRef.current.setLngLat(sliced.position);
      const truckEl = truckRef.current.getElement();
      if (truckEl) {
        truckEl.style.background =
          fraction >= 1 ? "#22c55e" : "#ff4d00";
      }
    }

    if (map && map.getStyle()) {
      ensureRouteLayers(map, currentRoute);

      const doneSource = map.getSource(
        "route-done",
      ) as maplibregl.GeoJSONSource | undefined;
      const restSource = map.getSource(
        "route-rest",
      ) as maplibregl.GeoJSONSource | undefined;

      doneSource?.setData(routeFeature(sliced.done));
      restSource?.setData(routeFeature(sliced.rest));

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[ShipmentSimulator] setData done/rest lengths:", {
          done: sliced.done.length,
          rest: sliced.rest.length,
          routeJson: JSON.stringify(currentRoute),
          canvas: `${map.getCanvas().width}x${map.getCanvas().height}`,
        });
      }

      // Ép vẽ lại: đề phòng render loop đang ngủ (tab nền, canvas resize...).
      map.triggerRepaint();

      if (process.env.NODE_ENV === "development") {
        // Hỏi thẳng renderer + worker: line có nằm trong output vẽ không?
        // rendered = số feature renderer thấy; sourced = số feature worker đã xử lý.
        map.once("render", () => {
          try {
            const rendered = map.queryRenderedFeatures({
              layers: ["route-rest", "route-done"],
            });
            let sourced: number | string = -1;
            try {
              sourced = map.querySourceFeatures("route-rest").length;
            } catch {
              sourced = "query-failed";
            }
            // eslint-disable-next-line no-console
            console.log(
              "[ShipmentSimulator] rendered route features:",
              rendered.length,
              "| source features:",
              sourced,
              "| style layers:",
              map.getStyle()?.layers?.map((l) => l.id),
            );
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log("[ShipmentSimulator] queryRenderedFeatures failed:", error);
          }
        });
        (window as unknown as { __shipmentMap?: maplibregl.Map }).__shipmentMap = map;
      }
    }

    if (
      followOnStart &&
      !initialFollowDoneRef.current &&
      map &&
      fraction < 0.02
    ) {
      initialFollowDoneRef.current = true;
      map.easeTo({
        center: sliced.position,
        zoom: 14,
        pitch: 45,
        duration: 900,
      });
    }
  };

  // Nạp progress local.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);

      if (raw) {
        const saved = JSON.parse(raw) as Partial<SimState>;
        const durationMs =
          typeof saved.durationMs === "number" && saved.durationMs > 0
            ? saved.durationMs
            : DEFAULT_DURATION_MS;

        const elapsedMs = Math.min(
          durationMs,
          Math.max(
            0,
            typeof saved.elapsedMs === "number" ? saved.elapsedMs : 0,
          ),
        );

        const savedStatus: SimStatus =
          saved.status === "done"
            ? "done"
            : saved.status === "running"
              ? "paused"
              : saved.status === "paused"
                ? "paused"
                : "idle";

        setState({
          status: savedStatus,
          elapsedMs,
          durationMs,
        });
      }
    } catch {
      // Ignore malformed/blocked storage.
    }

    setLoaded(true);
  }, [storageKey]);

  // Nhận progress phía kia khi local chưa bắt đầu.
  useEffect(() => {
    if (syncedProgress == null) return;

    const safeProgress = Math.min(100, Math.max(0, syncedProgress));

    setState((current) => {
      // Không ghi đè session mà user đang/chưa chạy dở trên máy này.
      if (current.status !== "idle" || current.elapsedMs !== 0) return current;
      if (safeProgress <= 0) return current;

      const elapsedMs = Math.min(
        current.durationMs,
        (safeProgress / 100) * current.durationMs,
      );

      return {
        ...current,
        elapsedMs,
        status: safeProgress >= 100 ? "done" : "paused",
      };
    });
  }, [syncedProgress]);

  // Save state khi pause/done/idle thay đổi; lúc running RAF sẽ throttle riêng.
  useEffect(() => {
    if (!loaded || state.status === "running") return;
    persistState(state, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state.status, state.elapsedMs, state.durationMs]);

  // Resolve route: NCC -> kho.
  useEffect(() => {
    const to =
      (warehouseCode && WAREHOUSE_COORDS[warehouseCode]) || DEFAULT_CENTER;

    const fallbackFrom: LngLat = [to[0] - 0.12, to[1] + 0.08];
    const fallbackRoute: LngLat[] = [fallbackFrom, to];

    routeRef.current = fallbackRoute;
    setRoute(fallbackRoute);
    setRouteNote("Đang tải tuyến đường...");

    let alive = true;

    void (async () => {
      try {
        const address = supplierAddress?.trim();
        const from = address ? await geocodeAddress(address) : null;

        if (!alive) return;

        if (!from) {
          setRouteNote(
            "Không định vị được địa chỉ NCC — đang dùng tuyến demo.",
          );
          return;
        }

        const resolvedRoute = await fetchRoute(from, to);

        if (!alive) return;

        if (resolvedRoute.length >= 2) {
          routeRef.current = resolvedRoute;
          setRoute(resolvedRoute);
          setRouteNote(
            resolvedRoute.length > 2
              ? ""
              : "Không lấy được đường lái xe chi tiết — đang dùng đường thẳng.",
          );
          return;
        }

        setRouteNote(
          "Không lấy được đường lái xe — đang dùng tuyến demo.",
        );
      } catch (error) {
        if (!alive) return;
        console.error("Shipment route resolution failed:", error);
        setRouteNote(
          "Không lấy được tuyến đường — đang dùng tuyến demo.",
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [supplierAddress, warehouseCode]);

  // Khởi tạo MapLibre đúng một lần.
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let alive = true;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          esri: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution:
              "© Esri & contributors, © OpenStreetMap contributors",
            maxzoom: 19,
          },
        },
        layers: [{ id: "esri", type: "raster", source: "esri" }],
      },
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const truck = new maplibregl.Marker({
      element: makeTruckEl(false),
    })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    const startMarker = new maplibregl.Marker({
      element: makeEndpointEl("#3b82f6"),
    })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    const endMarker = new maplibregl.Marker({
      element: makeEndpointEl("#16a34a"),
    })
      .setLngLat(DEFAULT_CENTER)
      .addTo(map);

    truckRef.current = truck;
    startRef.current = startMarker;
    endRef.current = endMarker;

    const onStyleReady = () => {
      if (!alive) return;

      ensureRouteLayers(map, routeRef.current);

      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.log("[ShipmentSimulator] style loaded:", map.isStyleLoaded());
        // eslint-disable-next-line no-console
        console.log(
          "[ShipmentSimulator] stylesheet ready:",
          Boolean(map.getStyle()),
        );
        // eslint-disable-next-line no-console
        console.log(
          "[ShipmentSimulator] route source:",
          map.getSource("route-rest"),
        );
        // eslint-disable-next-line no-console
        console.log(
          "[ShipmentSimulator] route layer:",
          map.getLayer("route-rest"),
        );
        // eslint-disable-next-line no-console
        console.log("[ShipmentSimulator] route:", routeRef.current);
      }

      setStyleReady(true);
      setMapError("");
    };

    const onError = (event: maplibregl.ErrorEvent) => {
      // Không dừng simulation chỉ vì basemap lỗi.
      console.error("MapLibre error:", event.error);
      if (alive) {
        setMapError(
          "Bản đồ nền đang gặp lỗi tải. Tiến độ giao hàng vẫn được lưu bình thường.",
        );
      }
    };

    // Dùng style.load thay vì load: source/layer chỉ add được khi style ready.
    if (map.isStyleLoaded()) {
      onStyleReady();
    } else {
      map.once("style.load", onStyleReady);
    }

    map.on("error", onError);

    return () => {
      alive = false;

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      map.off("error", onError);

      truckRef.current = null;
      startRef.current = null;
      endRef.current = null;

      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Route thay đổi -> marker + line + fitBounds.
  useEffect(() => {
    if (route.length === 0) return;

    routeRef.current = route;

    const from = route[0];
    const to = route[route.length - 1];

    startRef.current?.setLngLat(from);
    endRef.current?.setLngLat(to);

    setEndpointLabels(
      `Đi: ${shortLabel(supplierName)}`,
      `Đến: ${shortLabel(warehouseName)}`,
    );

    const fraction =
      state.durationMs > 0 ? state.elapsedMs / state.durationMs : 0;
    // updateVisuals tự ensure layer + setData khi style đã ready.
    updateVisuals(Math.min(1, Math.max(0, fraction)));

    const map = mapRef.current;
    if (!map) return;

    try {
      const bounds = route.reduce(
        (acc, point) => acc.extend(point as [number, number]),
        new maplibregl.LngLatBounds(
          route[0] as [number, number],
          route[0] as [number, number],
        ),
      );

      map.fitBounds(bounds, {
        padding: 48,
        maxZoom: 13,
        duration: 800,
      });
    } catch (error) {
      console.error("fitBounds failed:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    route,
    supplierName,
    warehouseName,
    styleReady,
  ]);

  // Khi style vừa sẵn sàng, sync lại visual progress hiện tại.
  useEffect(() => {
    if (!styleReady) return;

    const fraction =
      state.durationMs > 0 ? state.elapsedMs / state.durationMs : 0;
    updateVisuals(Math.min(1, Math.max(0, fraction)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleReady]);

  // Server progress KHÔNG phụ thuộc MapLibre/styleReady.
  useEffect(() => {
    const currentProgress =
      state.durationMs > 0
        ? Math.min(100, (state.elapsedMs / state.durationMs) * 100)
        : 0;

    const currentStage =
      state.status === "done" || currentProgress >= 100
        ? 2
        : currentProgress > 0
          ? 1
          : 0;

    pushProgress(
      currentProgress,
      state.status === "done",
      currentStage,
      state.status === "done",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.elapsedMs, state.durationMs, state.status]);

  // requestAnimationFrame: marker/line mượt, React chỉ update ~10 FPS.
  useEffect(() => {
    if (state.status !== "running") return;

    startedAtRef.current = performance.now();
    startElapsedRef.current = state.elapsedMs;
    lastReactUpdateRef.current = 0;
    initialFollowDoneRef.current = false;

    const tick = (now: number) => {
      if (startedAtRef.current == null) return;

      const elapsedSinceStart = now - startedAtRef.current;
      const elapsed = Math.min(
        state.durationMs,
        startElapsedRef.current + elapsedSinceStart,
      );

      const fraction =
        state.durationMs > 0 ? elapsed / state.durationMs : 1;

      updateVisuals(fraction, true);

      // React UI chỉ cần ~10 FPS, marker vẫn chạy theo RAF.
      if (
        now - lastReactUpdateRef.current >= REACT_PROGRESS_INTERVAL_MS ||
        elapsed >= state.durationMs
      ) {
        lastReactUpdateRef.current = now;

        setState((current) => {
          if (current.status !== "running") return current;

          return {
            ...current,
            elapsedMs: elapsed,
            status:
              elapsed >= current.durationMs ? "done" : "running",
          };
        });
      }

      // localStorage throttle riêng trong lúc chạy.
      if (
        Date.now() - lastStorageWriteRef.current >=
          STORAGE_WRITE_INTERVAL_MS ||
        elapsed >= state.durationMs
      ) {
        persistState(
          {
            status:
              elapsed >= state.durationMs ? "done" : "running",
            elapsedMs: elapsed,
            durationMs: state.durationMs,
          },
          elapsed >= state.durationMs,
        );
      }

      if (elapsed < state.durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startedAtRef.current = null;
    };
    // duration chỉ được đổi khi không running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.durationMs]);

  const start = () => {
    setState((current) => {
      if (current.status === "done") return current;
      return {
        ...current,
        status: "running",
      };
    });
  };

  const pause = () => {
    setState((current) => {
      if (current.status !== "running") return current;
      return {
        ...current,
        status: "paused",
      };
    });
  };

  const reset = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore.
    }

    serverPushRef.current = {
      time: 0,
      value: -1,
      stage: -1,
    };

    initialFollowDoneRef.current = false;

    const next: SimState = {
      status: "idle",
      elapsedMs: 0,
      durationMs: state.durationMs,
    };

    setState(next);
    updateVisuals(0);
    onProgressRef.current?.(0, false);

    const currentRoute = routeRef.current;
    const map = mapRef.current;

    if (map && currentRoute.length >= 2) {
      try {
        const bounds = currentRoute.reduce(
          (acc, point) => acc.extend(point as [number, number]),
          new maplibregl.LngLatBounds(
            currentRoute[0] as [number, number],
            currentRoute[0] as [number, number],
          ),
        );

        map.fitBounds(bounds, {
          padding: 48,
          maxZoom: 13,
          duration: 900,
          pitch: 0,
        });
      } catch (error) {
        console.error("Reset fitBounds failed:", error);
      }
    }
  };

  const changeDuration = (value: string) => {
    const durationMs = Number(value);
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;

    setState({
      status: "idle",
      elapsedMs: 0,
      durationMs,
    });

    updateVisuals(0);
    onProgressRef.current?.(0, false);
  };

  const stages = ["Chuẩn bị hàng", "Đang giao", "Đã tới kho"];

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4 text-primary" />
          Mô phỏng giao hàng
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="truncate text-xs text-muted-foreground">
          {supplierName}
          <span className="mx-1">→</span>
          {warehouseName}
        </p>

        <div className="relative overflow-hidden rounded-2xl border">
          <div
            ref={mapContainerRef}
            className="h-64 w-full bg-muted sm:h-72"
          />

          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-black text-white">
            {Math.floor(progress)}%
          </span>

          {(routeNote || mapError) && (
            <div className="absolute bottom-3 left-3 flex max-w-[78%] flex-col gap-1">
              {routeNote && (
                <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {routeNote}
                </span>
              )}

              {mapError && (
                <span className="rounded-lg bg-red-950/80 px-2 py-1 text-[10px] text-white">
                  {mapError}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center">
          {stages.map((label, idx) => {
            const done = idx < stage;
            const current = idx === stage;

            return (
              <div
                key={label}
                className={`flex items-center ${
                  idx < stages.length - 1 ? "flex-1" : ""
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-black ${
                      done
                        ? "border-green-500 bg-green-500 text-white"
                        : current
                          ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "border-muted-foreground/30 bg-card text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : idx + 1}
                  </span>

                  <span
                    className={`whitespace-nowrap text-[11px] font-semibold ${
                      current
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                {idx < stages.length - 1 && (
                  <div
                    className={`mx-1 mb-5 h-0.5 flex-1 rounded ${
                      idx < stage ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.status !== "running" ? (
            <Button
              size="sm"
              onClick={start}
              disabled={state.status === "done"}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {state.status === "paused" && state.elapsedMs > 0
                ? "Chạy tiếp"
                : "Bắt đầu giao"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={pause}
            >
              <Pause className="mr-1.5 h-4 w-4" />
              Tạm dừng
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Chạy lại
          </Button>

          <Select
            value={String(state.durationMs)}
            disabled={state.status === "running"}
            onValueChange={changeDuration}
          >
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {DURATIONS.map((duration) => (
                <SelectItem
                  key={duration.value}
                  value={String(duration.value)}
                >
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {state.status === "running" && (
            <span className="ml-auto text-xs text-muted-foreground">
              Còn khoảng{" "}
              {formatRemaining(
                state.durationMs - state.elapsedMs,
              )}
            </span>
          )}
        </div>

        {state.status === "done" && (
          <div className="flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30 sm:flex-row sm:items-center">
            <p className="flex flex-1 items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-300 sm:text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Xe đã tới {warehouseName} với đơn {poCode}.
              {resolvedReceiptHref
                ? " Tạo phiếu nhập để kiểm hàng."
                : " Kho sẽ kiểm hàng và nhập kho."}
            </p>

            {resolvedReceiptHref && (
              <Link href={resolvedReceiptHref}>
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <PackagePlus className="mr-1.5 h-4 w-4" />
                  Tạo phiếu nhập
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
