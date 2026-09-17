"use client";

import { useEffect, useState } from "react";
import { getSettings, type Settings } from "@/lib/settingsApi";

export interface StoreContact {
  storeName: string;
  phone: string;
  email: string;
  address: string;
}

const FALLBACK: StoreContact = {
  storeName: "MegaMart",
  phone: "1900 6789",
  email: "hotro@megamart.vn",
  address: "128 Nguyễn Gia Trí, Bình Thạnh, TP.HCM",
};

// Cache promise ở module scope để mọi component dùng chung 1 request
let cachedPromise: Promise<Settings | null> | null = null;

function toContact(s: Settings | null): StoreContact {
  if (!s) return FALLBACK;
  return {
    storeName: s.storeName || FALLBACK.storeName,
    phone: s.phone || FALLBACK.phone,
    email: s.email || FALLBACK.email,
    address: s.address || FALLBACK.address,
  };
}

/** Thông tin cửa hàng từ trang Admin → Cài đặt. Rớt mạng thì dùng giá trị mặc định. */
export function useStoreSettings(): StoreContact {
  const [contact, setContact] = useState<StoreContact>(FALLBACK);

  useEffect(() => {
    if (!cachedPromise) {
      cachedPromise = getSettings().catch(() => null);
    }
    let alive = true;
    cachedPromise.then((s) => {
      if (alive && s) setContact(toContact(s));
    });
    return () => {
      alive = false;
    };
  }, []);

  return contact;
}
