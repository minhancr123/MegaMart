import { ShoppingCart, Heart, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { MainContentProps, Product } from '@/interfaces/product';
import Image from 'next/image';
export default function MainContent({ featuredProducts, fetchCategories }: MainContentProps) {
  const defaultProducts : Product[] = [
    { id: 1, name: "iPhone 15 Pro", price: 29990000, imageUrl: "/api/placeholder/200/200" },
    { id: 2, name: "MacBook Air M3", price: 34990000, imageUrl: "/api/placeholder/200/200" },
    { id: 3, name: "AirPods Pro", price: 6990000, imageUrl: "/api/placeholder/200/200" },
    { id: 4, name: "iPad Air", price: 18990000, imageUrl: "/api/placeholder/200/200" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <div className="text-center mb-12 p-8 bg-gradient-to-r from-blue-400 to-purple-300 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">Khám phá sản phẩm chất lượng</h2>
        <p className="text-lg text-gray-600 mb-6">
          Hàng ngàn sản phẩm từ các thương hiệu uy tín với giá tốt nhất
        </p>
        <div className="flex gap-4 justify-center">
          <Button className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Tìm kiếm ngay
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Xem giỏ hàng
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <div>
       <section>
        <h2 className="text-2xl font-bold mb-4">Danh mục sản phẩm</h2>
        <ul className="list-disc pl-5">
          {fetchCategories.map((category) => (
            <li key={category.id} className="text-gray-700">
              {category.name}

              {/* Nếu có children */}
              {category.children && category.children.length > 0 && (
                <ul className="ml-5 list-disc">
                  {category.children.map((child) => (
                    <li key={child.id}>{child.name}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      </div>
      {/* Featured Products */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Sản phẩm nổi bật</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardHeader className="p-0">
                <div className="h-48 bg-gray-100 flex items-center justify-center rounded-t-lg relative overflow-hidden">
                  {product.imageUrl?.startsWith('/images/') ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      priority={product.id <= 2}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Hình ảnh sản phẩm</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 text-gray-800 line-clamp-2">{product.name}</h3>
                <p className="text-lg font-bold text-red-600">{product.price}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 hover:text-red-500 hover:border-red-500"
                  aria-label={`Thêm ${product.name} vào danh sách yêu thích`}
                >
                  <Heart className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Yêu thích</span>
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  aria-label={`Thêm ${product.name} vào giỏ hàng`}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Thêm vào giỏ</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
