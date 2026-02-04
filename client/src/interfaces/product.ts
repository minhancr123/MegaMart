export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  soldCount?: number;
  variants?: Variant[];
  images?: ProductImage[];
  category?: Category;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VariantAttributes {
  [key: string]: string;
}

export interface Variant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  attributes?: VariantAttributes;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
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
  imageUrl?: string;
  tags?: string[];
  createdAt: string;
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
  imageUrl?: string;
  tags?: string[];
}

export interface PostUpdateData {
  title?: string;
  excerpt?: string;
  content?: string;
  type?: string;
  status?: string;
  imageUrl?: string;
  tags?: string[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

