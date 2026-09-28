import MainContent from "@/components/MainContent";
import { Category } from "@/interfaces/product";
import axiosClient from "@/lib/axiosClient";
import { fetchCategoriesList, fetchFeaturedProducts } from "@/lib/productApi";
import { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = {
  title: 'MegaMart VN - Điện máy chính hãng, giá tốt',
  description: 'Mua tivi, máy lạnh, tủ lạnh, máy giặt, laptop và thiết bị gia dụng chính hãng tại MegaMart VN.',
  keywords: 'điện máy, tivi, máy lạnh, tủ lạnh, máy giặt, laptop, gia dụng',
  openGraph: {
    title: 'MegaMart VN - Điện máy chính hãng, giá tốt',
    description: 'Khám phá hàng ngàn sản phẩm điện máy chính hãng với giá tốt.',
    type: 'website',
  },
};

// Trang chủ gọi API ở server nên mặc định Next.js prerender lúc `next build`
// và đóng băng HTML kèm cache 1 năm. Giá và ảnh sản phẩm thay đổi liên tục
// nên phải render mỗi request, có cache ngắn để chịu tải.
export const dynamic = "force-dynamic";
export const revalidate = 60;

//Fetch data SSR
// Ba nguồn dữ liệu này độc lập nhau nên gọi song song. Gọi tuần tự cộng dồn
// ~3s chờ SSR, đủ để Next.js render trang rỗng khi một request chậm.
async function getFeaturedProducts(): Promise<any[]> {
  try {
    const res = await fetchFeaturedProducts();
    return Array.isArray(res) ? res : [];
  } catch (error) {
    // Không nuốt lỗi rồi trả [] — trước đây lỗi ở đây làm trang chủ render
    // rỗng mà không có dấu vết gì trong log.
    console.error("[home] featured products failed:", error);
    return [];
  }
}

async function getCategoriesList(): Promise<Category[]> {
  try {
    const res = await fetchCategoriesList();
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.error("[home] categories failed:", error);
    return [];
  }
}

async function getLatestPosts(): Promise<any[]> {
  try {
    const res: any = await axiosClient.get('/posts', { params: { limit: 3, status: 'PUBLISHED' } });
    if (Array.isArray(res)) return res;
    if (res?.data) return Array.isArray(res.data) ? res.data : res.data.data || [];
    return [];
  } catch (error) {
    console.error("[home] latest posts failed:", error);
    return [];
  }
}

export default async function Home() {
  const [featuredProducts, fetchCategories, latestPosts] = await Promise.all([
    getFeaturedProducts(),
    getCategoriesList(),
    getLatestPosts(),
  ]);

  // Prod vẫn log Next.js (container ghi ra docker logs) nhưng chỉ in số lượng,
  // không in cả payload để log khỏi phình theo từng sản phẩm.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[home] counts', {
      featured: featuredProducts.length,
      categories: fetchCategories.length,
      posts: latestPosts.length,
    });
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <MainContent featuredProducts={featuredProducts} fetchCategories={fetchCategories} newsPosts={latestPosts} />
    </div>
  );
}
