import { NextRequest, NextResponse } from "next/server";

function getContextName(context: any, type: string): string {
  if (!context) return "";
  if (Array.isArray(context)) {
    const item = context.find((c: any) => c.id?.startsWith(type) || c.types?.includes(type));
    return item?.text_vi || item?.text || item?.name || "";
  }
  return (
    context[type]?.name ||
    context[type]?.name_preferred ||
    ""
  );
}

function parseAddressFromText(fullText: string) {
  const parts = fullText.split(",").map((p) => p.trim());
  let province = "";
  let district = "";
  let ward = "";

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const lower = part.toLowerCase();
    if (lower === "việt nam" || lower === "vietnam" || /^\d+$/.test(lower)) continue;

    // Thành phố Thủ Đức là đơn vị cấp huyện thuộc TP.HCM, phải bắt trước
    // rule "thành phố" của cấp tỉnh bên dưới.
    if (!district && lower.includes("thủ đức")) {
      district = part;
      continue;
    }

    if (!province && (lower.includes("hồ chí minh") || lower.includes("hà nội") || lower.includes("đà nẵng") || lower.includes("huế") || lower.includes("cần thơ") || lower.includes("hải phòng") || lower.includes("tỉnh") || lower.includes("thành phố"))) {
      province = part;
      continue;
    }

    if (!district && (lower.includes("quận") || lower.includes("huyện") || lower.includes("thị xã") || (province !== "" && (lower.includes("thành phố") || /(^|\s)tp\.?(\s|$)/.test(lower))))) {
      district = part;
      continue;
    }

    if (!ward && (lower.includes("phường") || lower.includes("xã") || lower.includes("thị trấn"))) {
      ward = part;
      continue;
    }
  }

  return { province, district, ward };
}

const normGeoText = (s?: string | null) =>
  (s || "")
    .toLowerCase()
    .replace(/(^|[\s,])([pq])\.\s*/g, "$1")
    .replace(/^(tỉnh|thành phố|tp|quận|huyện|thị xã|phường|xã|thị trấn)[\s.]+/, "")
    .replace(/[^a-z0-9à-ỹđ ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ward do OSM reverse-geocode trả về đôi khi thực chất là tên cấp
 * quận/huyện (suburb = "Quận 1") hoặc trùng luôn district/province.
 * Lọc bỏ để client không điền sai rồi fail khi đối chiếu GHN.
 */
function sanitizeWard(ward: string, district: string, province: string): string {
  const w = (ward || "").trim();
  if (!w) return "";
  const lower = w.toLowerCase();
  if (lower.includes("thị xã")) return "";
  const hasUpperKeyword =
    lower.includes("quận") ||
    lower.includes("huyện") ||
    lower.includes("tỉnh") ||
    lower.includes("thành phố");
  const hasWardKeyword =
    lower.includes("phường") ||
    lower.includes("thị trấn") ||
    /(^|\s)xã(\s|$)/.test(lower);
  if (hasUpperKeyword && !hasWardKeyword) return "";
  const nw = normGeoText(w);
  if (!nw) return "";
  // Chỉ loại khi ward KHÔNG mang tiền tố cấp xã mà lại trùng tên district/
  // province (VD suburb "Củ Chi" == Huyện Củ Chi). Thị trấn/Xã/Phường trùng
  // tên huyện (Thị trấn Củ Chi, Xã Ba Vì...) là địa giới thật, phải giữ.
  if (!hasWardKeyword && (nw === normGeoText(district) || nw === normGeoText(province))) return "";
  return w;
}

/**
 * Reverse Geocoding qua OpenStreetMap Nominatim khi Mapbox thiếu cấp Phường/Xã
 */
async function fetchReverseOsmWard(lat: number, lng: number): Promise<string> {
  if (!lat || !lng) return "";
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
      {
        headers: { "User-Agent": "MegaMart-App/1.0" },
        next: { revalidate: 86400 }, // Cache 24 hours
      }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const addr = data?.address || {};
    // Nominatim trả ward ở nhiều key khác nhau tùy vùng (suburb phổ biến
    // nhất cho phường ở VN); thêm hamlet cho xã vùng ven.
    const raw =
      addr.suburb || addr.quarter || addr.neighbourhood || addr.village || addr.hamlet || "";
    // suburb đôi khi là tên quận/huyện -> sanitize ở caller, ở đây chỉ trim.
    return raw.trim();
  } catch {
    return "";
  }
}

function buildStreetAddress(feature: any, houseNumOverride?: string): string {
  const prop = feature.properties || {};
  const context = prop.context || feature.context || {};
  
  const name = prop.name || feature.text || "";
  let street = "";

  if (Array.isArray(context)) {
    const streetItem = context.find((c: any) => c.id?.startsWith("address") || c.id?.startsWith("street"));
    street = streetItem?.text || "";
  } else {
    const addressNum = context.address?.address_number || "";
    const streetName = context.address?.street_name || context.street?.name || "";
    street = [addressNum, streetName].filter(Boolean).join(" ").trim();
  }

  let finalAddress = name || street || prop.full_address || feature.place_name || "";
  if (houseNumOverride && !finalAddress.startsWith(houseNumOverride)) {
    finalAddress = `${houseNumOverride} ${finalAddress}`;
  }
  return finalAddress;
}

export async function POST(req: NextRequest) {
  try {
    const { mapboxId, sessionToken, cachedFeature, fallbackFullText } = await req.json();

    if (!mapboxId || typeof mapboxId !== "string") {
      return NextResponse.json(
        { error: "mapboxId is required" },
        { status: 400 }
      );
    }

    const token =
      process.env.MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Mapbox token is missing" },
        { status: 500 }
      );
    }

    // Case 1: Geocoding item (format: geo:address.123...)
    if (mapboxId.startsWith("geo:")) {
      let feature = cachedFeature;
      const rawHouseNum = cachedFeature?._rawHouseNumber || "";

      const fullTextToParse = fallbackFullText || cachedFeature?.place_name_vi || cachedFeature?.place_name || "";
      const parsedFromText = parseAddressFromText(fullTextToParse);

      const coords = feature?.center || feature?.geometry?.coordinates || [0, 0];
      const lng = Number(coords[0] || 0);
      const lat = Number(coords[1] || 0);
      const context = feature?.context || [];

      let province =
        getContextName(context, "place") ||
        getContextName(context, "region") ||
        parsedFromText.province;

      let district =
        getContextName(context, "locality") ||
        getContextName(context, "district") ||
        parsedFromText.district;

      let ward =
        getContextName(context, "neighborhood") ||
        parsedFromText.ward;

      // Dynamic Reverse Geocode via OSM when ward is missing
      if (!ward && lat && lng) {
        ward = await fetchReverseOsmWard(lat, lng);
      }
      ward = sanitizeWard(ward, district, province);

      const formattedAddress = fallbackFullText || feature?.place_name_vi || feature?.place_name || feature?.text || "";

      return NextResponse.json({
        formattedAddress,
        streetAddress: formattedAddress,
        province,
        district,
        ward,
        lat,
        lng,
      });
    }

    // Case 2: Standard Mapbox Search Box v1 retrieve
    const params = new URLSearchParams({
      access_token: token,
      session_token: sessionToken || "megamart-session",
    });

    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
      mapboxId
    )}?${params.toString()}`;

    const response = await fetch(url, { method: "GET" });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const feature = data.features?.[0];
    if (!feature) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 444 }
      );
    }

    const coords = feature.geometry?.coordinates || [0, 0];
    const lng = Number(coords[0] || 0);
    const lat = Number(coords[1] || 0);

    const prop = feature.properties || {};
    const context = prop.context || {};
    const fullTextToParse = prop.full_address || prop.place_formatted || prop.name || "";
    const parsedFromText = parseAddressFromText(fullTextToParse);

    let province =
      getContextName(context, "region") ||
      getContextName(context, "place") ||
      parsedFromText.province;

    let district =
      getContextName(context, "district") ||
      getContextName(context, "locality") ||
      parsedFromText.district;

    let ward =
      getContextName(context, "neighborhood") ||
      getContextName(context, "locality") ||
      parsedFromText.ward;

    // Dynamic Reverse Geocode via OSM when ward is missing
    if (!ward && lat && lng) {
      ward = await fetchReverseOsmWard(lat, lng);
    }
    ward = sanitizeWard(ward, district, province);

    const formattedAddress = prop.full_address || prop.place_formatted || prop.name || "";

    return NextResponse.json({
      formattedAddress,
      streetAddress: buildStreetAddress(feature),
      province,
      district,
      ward,
      lat,
      lng,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
