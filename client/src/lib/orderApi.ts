import axiosClient from './axiosClient';

interface OrderItem {
    variant?: {
        product?: {
            id: string;
            name: string;
        };
    };
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    total: number;
    status: string;
    items?: OrderItem[];
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
}

type OrderCreateData = Omit<Order, 'id' | 'createdAt' | 'updatedAt'>;

export const createOrder = async (payload: OrderCreateData) => {
  try {
    const res = await axiosClient.post('/orders', payload);
    return res;
  } catch (error: unknown) {
    console.error('Create order error:', error);
    throw error;
  }
};

export const fetchOrders = async () => {
  try {
    const res = await axiosClient.get('/orders');
    return res;
  } catch (error: unknown) {
    console.error('Fetch orders error:', error);
    throw error;
  }
};

export const fetchOrdersByUser = async (userId: string) => {
  try {
    const res = await axiosClient.get(`/orders/user/${userId}`);
    console.log("fetchOrdersByUser response:", res);
    
    // Interceptor đã transform response:
    // Backend: { success: true, data: [...], message: "..." }
    // Interceptor returns: nested (array) ?? root (object)
    // Vì data là array, interceptor sẽ return array trực tiếp
    
    // Nếu res là array -> return luôn
    if (Array.isArray(res)) {
      console.log("Response is array:", res);
      return res;
    }
    
    // Nếu res là object với data property
    if (res?.data && Array.isArray(res.data)) {
      console.log("Response has data array:", res.data);
      return res.data;
    }
    
    // Fallback
    console.log("Fallback to empty array");
    return [];
  } catch (error: unknown) {
    console.error('Fetch orders by user error:', error);
    throw error;
  }
};

export const fetchOrderById = async (orderId: string) => {
  try {
    const res = await axiosClient.get(`/orders/${orderId}`);
    console.log("fetchOrderById response:", res);
    
    // Interceptor transform - có thể return object trực tiếp hoặc có wrapper
    // Nếu res có id property -> đó là order object
    if ((res as { id?: string })?.id) {
      return res;
    }
    
    // Nếu có data property
    if ((res as { data?: unknown })?.data && typeof (res as { data?: unknown }).data === 'object') {
      return (res as { data?: Order }).data;
    }
    
    return res;
  } catch (error: unknown) {
    console.error('Fetch order by ID error:', error);
    throw error;
  }
};

export const cancelOrder = async (orderId: string) => {
  try {
    const res = await axiosClient.delete(`/orders/${orderId}`);
    return res;
  } catch (error: unknown) {
    console.error('Cancel order error:', error);
    throw error;
  }
};
