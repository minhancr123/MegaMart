export interface Product {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  price: number;
  /** URL ảnh minh họa xen trong mô tả; vị trí chèn là marker [DESCIMG:n]. */
  descriptionImages?: string[];
  imageUrl?: string;
  soldCount?: number;
  variants?: Variant[];
  images?: ProductImage[];
  category?: Category;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Một dòng trong bảng "Thông số kỹ thuật", crawler ghi vào Variant.attributes. */
export interface SpecRow {
  label: string;
  value: string;
  /** Nhóm thông số ("Tổng quan sản phẩm", "Cổng kết nối"…) - chỉ Điện Máy Chợ Lớn có. */
  group?: string;
}

export interface VariantAttributes {
  /** Đặc điểm nổi bật, mỗi phần tử một dòng. */
  specs?: string[];
  /** Bảng thông số kỹ thuật lấy từ trang chi tiết của sàn nguồn. */
  specsTable?: SpecRow[];
  [key: string]: unknown;
}

export interface Variant {
  id: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  discountPercent?: number | null;
  stock: number;
  /** Tồn đang giữ cho đơn chưa xuất. Available = stock - reservedQuantity. */
  reservedQuantity?: number | null;
  availableStock?: number | null;
  colors?: Array<{ hex?: string; name?: string; imageUrl?: string }> | null;
  attributes?: VariantAttributes;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  displayOrder?: number;
  alt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  variant: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    attributes?: any;
    product: {
      id: string;
      name: string;
      description?: string;
      images: ProductImage[];
    };
  };
}

export interface CartData {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items: CartItem[];
}

export interface Cart {
  success: boolean;
  data: CartData;
  message: string;
}

export interface MainContentProps {
  featuredProducts: Product[];
  fetchCategories: Category[];
  newsPosts?: any[];
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export interface CartListProps {
  cart: Cart;
}

export interface PostAuthor {
  id: string;
  name: string;
}

export interface Post {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  type: string;
  status: string;
  thumbnail?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt: string;
  publishedAt?: string;
  author?: PostAuthor;
}

export interface PostParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  sort?: string;
}

export interface PostCreateData {
  title: string;
  excerpt?: string;
  content: string;
  type: string;
  status: string;
  thumbnail?: string;
  tags?: string[];
}

export interface PostUpdateData {
  title?: string;
  excerpt?: string;
  content?: string;
  type?: string;
  status?: string;
  thumbnail?: string;
  tags?: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
