"use client";

import { MapPin } from "lucide-react";

interface ShipperLocationMapProps {
  lat: number;
  lng: number;
  destLat?: number | null;
  destLng?: number | null;
  destinationAddress?: string | null;
  updatedAt?: string;
  title?: string;
}

export function ShipperLocationMap({ lat, lng, destLat, destLng, destinationAddress, updatedAt, title = "Hành trình giao hàng" }: ShipperLocationMapProps) {
  // Lấy API Key từ môi trường (Cần cấu hình NEXT_PUBLIC_GOOGLE_MAPS_API_KEY trong .env)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const destination = destLat && destLng ? `${destLat},${destLng}` : destinationAddress?.trim() || "";
  const encodedDestination = encodeURIComponent(destination);
  const hasDirections = Boolean(apiKey && destination);

  const mapUrl = hasDirections
    ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${lat},${lng}&destination=${encodedDestination}&mode=driving`
    : `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {title}
        </p>
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground italic">
            Cập nhật: {new Date(updatedAt).toLocaleTimeString("vi-VN")}
          </p>
        )}
      </div>
      <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-border shadow-inner bg-muted">
        <iframe
          title="Shipper Location"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src={mapUrl}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  );
}
