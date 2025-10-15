import axiosClient from "./axiosClient";

const CartApis = {
  getCartItem: (id: string) => axiosClient.get(`/cart/${id}`),
  addToCart: (userId: string, variantId: string, quantity: number) =>
    axiosClient.post("/cart/item", { userId, variantId, quantity }),
  updateCartItem: (itemId: string, quantity: number) =>
    axiosClient.patch(`/cart/item/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => axiosClient.delete(`/cart/item/${itemId}`),
};

export const addToCart = async (userId : string ,variantId: string, quantity: number) => {
  try {
    const response = await CartApis.addToCart(userId,variantId, quantity);
    console.log('Add to cart response:', response);
    return response;
  } catch (error: any) {
    return error.response?.data?.message || "Failed to add item to cart";
  }
};

export const fetchCartItem = async (id: string) => {
  try {
    const response = await CartApis.getCartItem(id);
    console.log('Cart API response:', response);
    return response;
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    throw new Error(error.errormassage || "Failed to fetch cart item");
  }
};


export const updateQuantityChange = async (itemId: string, quantity: number) => {
  try {
    const response = await CartApis.updateCartItem(itemId, quantity);
    console.log('Update quantity response:', response);
    return response;
  } catch (error: any) {
    console.error('Error updating quantity:', error);
    throw new Error(error.errormassage || "Failed to update cart item quantity");
  }
};

export const removeCartItem = async (itemId: string) => {
  try {
    const res = await CartApis.removeCartItem(itemId);
    return res;
  } catch (error: any) {
    return error.response?.data?.message || "Failed to remove cart item";
  }
};