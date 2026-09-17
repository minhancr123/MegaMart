import axiosClient from "./axiosClient";

export interface CreateVNPayPaymentResponse {
  success: boolean;
  data?: {
    paymentUrl: string;
  };
  message: string;
}

/**
 * Create VNPay payment URL for an order
 */
export const createVNPayPayment = async (orderId: string): Promise<CreateVNPayPaymentResponse> => {
  try {
    const response: any = await axiosClient.post(`/payment/vnpay/${orderId}`);
    console.log('createVNPayPayment raw response:', response);
    
    return (response?.data ?? response) as CreateVNPayPaymentResponse;
  } catch (error: unknown) {
    console.error('createVNPayPayment error:', error);
    const err = error as { response?: { data?: { message?: string } } };
    throw err?.response?.data || error;
  }
};

/**
 * Process COD payment for an order
 */
export const processCODPayment = async (orderId: string) => {
  try {
    const response: any = await axiosClient.post(`/payment/cod/${orderId}`);
    return response?.data ?? response;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    throw err?.response?.data || error;
  }
};

/**
 * Get payment info by order ID
 */
export const getPaymentByOrderId = async (orderId: string) => {
  try {
    const response: any = await axiosClient.get(`/payment/order/${orderId}`);
    return response?.data ?? response;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    throw err?.response?.data || error;
  }
};
