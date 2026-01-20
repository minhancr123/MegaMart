import axiosClient from "./axiosClient";

export interface VoucherValidateResult {
  voucher: any;
  discount: number;
}

export const validateVoucher = async (code: string, subtotal: number) => {
  const res = await axiosClient.get(`/vouchers/${code}/validate`, {
    params: { subtotal },
  });
  return (res as any)?.data || res;
};
