import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { input, sessionToken } = await req.json();

    if (!input || typeof input !== "string" || !input.trim()) {
      return NextResponse.json({ suggestions: [] });
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

    const trimmed = input.trim();

    // Match leading house/alley number if present (e.g. 315/1 or 231B or 45A)
    const houseNumberMatch = trimmed.match(/^(\d+[\/\w-]*)/i);
    const houseNumber = houseNumberMatch ? houseNumberMatch[1] : "";

    let geoSuggestions: any[] = [];

    if (houseNumber) {
      try {
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          trimmed
        )}.json?country=vn&language=vi&access_token=${token}`;

        const geoRes = await fetch(geoUrl, { method: "GET" });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          geoSuggestions = (geoData?.features || []).map((f: any) => {
            const rawPlaceName = f.place_name_vi || f.place_name || f.text;
            const displayName = houseNumber && !rawPlaceName.startsWith(houseNumber)
              ? `${houseNumber} ${rawPlaceName}`
              : rawPlaceName;

            return {
              mapbox_id: `geo:${f.id}`,
              name: displayName,
              place_formatted: f.place_name_vi || f.place_name,
              full_address: displayName,
              feature_type: f.place_type?.[0] || "address",
              _feature: f,
              _rawHouseNumber: houseNumber,
            };
          });
        }
      } catch (err) {
        console.warn("Geocoding lookup error:", err);
      }
    }

    // Query Mapbox Search Box API (v1 suggest)
    const params = new URLSearchParams({
      q: trimmed,
      country: "vn",
      language: "vi",
      access_token: token,
      session_token: sessionToken || "megamart-session",
    });

    const response = await fetch(
      `https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`,
      { method: "GET" }
    );

    const data = await response.json();
    const searchBoxSuggestions = data?.suggestions || [];

    // Filter Search Box suggestions to keep only ones that closely relate to meaningful words
    const words = trimmed
      .toLowerCase()
      .split(/[\s,/-]+/)
      .filter((w) => w.length > 2 && !/^\d+$/.test(w));

    const relevantSearchBox = searchBoxSuggestions.filter((s: any) => {
      if (words.length === 0) return true;
      const text = `${s.name} ${s.place_formatted || ""} ${s.address || ""}`.toLowerCase();
      return words.some((word) => text.includes(word));
    });

    // Merge: Geocoding results (with house number attached) first, then search box items
    const combined = [...geoSuggestions, ...relevantSearchBox];
    
    // Deduplicate by name
    const seen = new Set<string>();
    const suggestions = combined.filter((item) => {
      const key = `${item.name}-${item.place_formatted}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
