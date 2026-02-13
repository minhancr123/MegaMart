"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, MapPin } from "lucide-react";
import Image from "next/image";

// Fake data for social proof
const FAKE_NAMES = [
  "Nguyễn Văn A", "Trần Thị B", "Lê Minh C", "Phạm Thu D",
  "Hoàng Đức E", "Vũ Thị F", "Đặng Văn G", "Bùi Thu H",
  "Ngô Minh I", "Dương Thị K", "Lý Văn L", "Trịnh Thị M",
  "Mai Văn N", "Hồ Thu P", "Phan Minh Q", "Võ Thị R",
  "Đinh Văn S", "Lương Thị T", "Tạ Minh U", "Châu Thị V",
];

const FAKE_LOCATIONS = [
  "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ",
  "Hải Phòng", "Biên Hòa", "Nha Trang", "Huế",
  "Buôn Ma Thuột", "Vũng Tàu", "Quy Nhơn", "Thanh Hóa",
  "Thái Nguyên", "Nam Định", "Vinh", "Long Xuyên",
];

const FAKE_PRODUCTS = [
  { name: "iPhone 15 Pro Max", price: 34990000, image: "" },
  { name: "Samsung Galaxy S24 Ultra", price: 31990000, image: "" },
  { name: "MacBook Air M3", price: 27490000, image: "" },
  { name: "iPad Air 2024", price: 16990000, image: "" },
  { name: "AirPods Pro 2", price: 5990000, image: "" },
  { name: "Apple Watch Series 9", price: 10990000, image: "" },
  { name: "Xiaomi 14 Ultra", price: 23990000, image: "" },
  { name: "Sony WH-1000XM5", price: 7990000, image: "" },
  { name: "Dell XPS 15", price: 42990000, image: "" },
  { name: "Logitech MX Master 3S", price: 2490000, image: "" },
  { name: "Samsung Galaxy Tab S9", price: 19990000, image: "" },
  { name: "JBL Charge 5", price: 3290000, image: "" },
];

const FAKE_TIMES = [
  "vừa xong", "1 phút trước", "2 phút trước", "3 phút trước",
  "5 phút trước", "8 phút trước", "10 phút trước", "12 phút trước",
  "15 phút trước", "20 phút trước",
];

interface SocialProofData {
  name: string;
  location: string;
  product: string;
  price: number;
  time: string;
  image: string;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateProof(): SocialProofData {
  const product = getRandomItem(FAKE_PRODUCTS);
  return {
    name: getRandomItem(FAKE_NAMES),
    location: getRandomItem(FAKE_LOCATIONS),
    product: product.name,
    price: product.price,
    time: getRandomItem(FAKE_TIMES),
    image: product.image,
  };
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);

export default function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<SocialProofData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const showNotification = useCallback(() => {
    if (dismissed) return;
    const proof = generateProof();
    setData(proof);
    setVisible(true);

    // Auto hide after 5 seconds
    setTimeout(() => {
      setVisible(false);
    }, 5000);
  }, [dismissed]);

  useEffect(() => {
    // First show after 15 seconds
    const initialTimeout = setTimeout(() => {
      showNotification();
    }, 15000);

    // Then show every 30-60 seconds
    const interval = setInterval(() => {
      const randomDelay = Math.random() * 30000 + 30000; // 30-60s
      setTimeout(showNotification, randomDelay);
    }, 45000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [showNotification]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {visible && data && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-[60] max-w-[340px]"
        >
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Top accent line */}
            <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </button>

            <div className="p-3 flex gap-3">
              {/* Product Image or Icon */}
              <div className="w-14 h-14 flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white leading-snug">
                  <span className="font-bold">{data.name}</span>
                  {" "}vừa mua
                </p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                  {data.product}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {data.location}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {data.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Verified badge */}
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Đã xác minh bởi MegaMart
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
