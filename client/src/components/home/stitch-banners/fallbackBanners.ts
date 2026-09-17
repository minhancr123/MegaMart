import type { Banner } from "@/lib/marketingApi";

export type StitchBannerKind = "electronics" | "delivery" | "trade-in";

const createdAt = "2026-09-01T00:00:00.000Z";

export const fallbackBanners: Banner[] = [
  {
    id: "stitch-fallback-electronics",
    title: "Đại tiệc điện máy 9.9",
    description: "Smart TV 4K OLED · Máy lạnh Inverter · Tủ lạnh dung tích lớn · Máy giặt AI giảm đến 50%.",
    imageUrl: "",
    linkUrl: "/products",
    displayOrder: 0,
    active: true,
    endDate: "2027-12-31T23:59:59+07:00",
    position: "HOME_SLIDER",
    template: "TEMPLATE_1",
    ctaText: "Sắm ngay kẻo lỡ",
    badgeText: "Siêu sale 9.9",
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "stitch-fallback-delivery",
    title: "Freeship toàn quốc · Giao siêu tốc 2H",
    description: "Miễn phí vận chuyển đơn điện máy từ 500.000₫, giao hỏa tốc 2H tại TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ.",
    imageUrl: "",
    linkUrl: "/products",
    displayOrder: 1,
    active: true,
    position: "HOME_SLIDER",
    template: "TEMPLATE_2",
    ctaText: "Mua hàng giao ngay 2H",
    badgeText: "MegaMart Express",
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: "stitch-fallback-trade-in",
    title: "Thu cũ đổi mới · Trợ giá đến 5.000.000₫",
    description: "Trả góp 0% lãi suất, duyệt nhanh 5 phút, bảo hành 36 tháng chính hãng.",
    imageUrl: "",
    linkUrl: "/products",
    displayOrder: 2,
    active: true,
    position: "HOME_SLIDER",
    template: "TEMPLATE_3",
    ctaText: "Định giá máy cũ ngay",
    badgeText: "Đặc quyền nâng cấp",
    createdAt,
    updatedAt: createdAt,
  },
];

export function getStitchBannerKind(banner: Banner): StitchBannerKind | null {
  if (banner.id === "stitch-fallback-electronics") return "electronics";
  if (banner.id === "stitch-fallback-delivery") return "delivery";
  if (banner.id === "stitch-fallback-trade-in") return "trade-in";
  return null;
}
