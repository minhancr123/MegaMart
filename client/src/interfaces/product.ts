export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  variants?: Variant[];
  images?: ProductImage[];
  category?: Category;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Variant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  attributes?: any;
}

export interface ProductImage {
  id: string;
  url: string;
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
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

export interface CartListProps {
  cart: Cart;
}

