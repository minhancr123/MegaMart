import MainContent from "@/components/MainContent";
import { Category } from "@/interfaces/product";
import axiosClient from "@/lib/axiosClient";
import { fetchCategoriesList, fetchFeaturedProducts } from "@/lib/productApi";
import { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = {
  title: 'Mega Shop - Trang chủ | Sản phẩm chính hãng giá tốt',
  description: 'Khám phá hàng ngàn sản phẩm chất lượng từ các thương hiệu uy tín với giá tốt nhất tại Mega Shop',
  keywords: 'mua sắm online, điện thoại, laptop, phụ kiện, giá rẻ',
  openGraph: {
    title: 'Mega Shop - Sản phẩm chính hãng giá tốt',
    description: 'Khám phá hàng ngàn sản phẩm chất lượng với giá tốt nhất',
    type: 'website',
  },
};

//Fetch data SSR
async function getFeaturedProducts(): Promise<any[]> {
  try {
    const res = await fetchFeaturedProducts();
    console.log("Featured Products API Response:", res);
    // if (!res) {
    //     console.log('Failed to fetch featured products:', res);
    //     throw new Error('Failed to fetch data');
    // }
    return Array.isArray(res) ? res : [];
  } catch (error: any) {
    console.error(error);
    return error;
  }
}
async function getCategoriesList(): Promise<Category[]> {
  try {
    const res = await fetchCategoriesList();
    return Array.isArray(res) ? res : [];
  } catch (error: any) {
    console.error(error);
    return error;
  }
}

async function getLatestPosts(): Promise<any[]> {
  try {
    const res: any = await axiosClient.get('/posts', { params: { limit: 3, status: 'PUBLISHED' } });
    if (Array.isArray(res)) return res;
    if (res?.data) return Array.isArray(res.data) ? res.data : res.data.data || [];
    return res;
  } catch (error: any) {
    console.error('Failed to fetch latest posts:', error);
    return [];
  }
}

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();
  const fetchCategories = await getCategoriesList();
  const latestPosts = await getLatestPosts();
  console.log("Home page - Featured Products:", featuredProducts);
  console.log("Home page - Categories:", fetchCategories);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MainContent featuredProducts={featuredProducts} fetchCategories={fetchCategories} newsPosts={latestPosts} />
    </div>
  );
}