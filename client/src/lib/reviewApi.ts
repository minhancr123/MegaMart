import axiosClient from "./axiosClient";

export const fetchReviewsByProduct = async (productId: string) => {
  const res = await axiosClient.get(`/reviews/product/${productId}`);
  const data = (res as any)?.data || res;
  return data;
};

export const createReview = async (payload: { productId: string; rating: number; comment?: string; images?: string[]; userId?: string }) => {
  const res = await axiosClient.post(`/reviews`, payload);
  const data = (res as any)?.data || res;
  return data;
};
