import axiosClient from './axiosClient';

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  provinceId?: number | null;
  districtId?: number | null;
  wardCode?: string | null;
  label?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  userId : string | undefined;
  fullName: string;
  phone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  provinceId?: number | null;
  districtId?: number | null;
  wardCode?: string | null;
  label?: string;
  isDefault?: boolean;
}

export const fetchAddressesByUser = async (userId: string): Promise<Address[]> => {
  try {
    const res: any = await axiosClient.get(`/address/user/${userId}`);
    console.log(res);
    if (Array.isArray(res)) {
      return res;
    }
    return Array.isArray(res?.data) ? res.data : [];
  } catch (error: unknown) {
    console.error('Fetch addresses error:', error);
    throw error;
  }
};

export const getDefaultAddress = async (userId: string): Promise<Address | null> => {
  try {
    const res: any = await axiosClient.get(`/address/default/${userId}`);
    return res?.data ?? res ?? null;
  } catch (error: unknown) {
    console.error('Get default address error:', error);
    return null;
  }
};

export const createAddress = async (data: CreateAddressDto) => {
  try {
    const res: any = await axiosClient.post('/address', data);
    return res?.data ?? res;
  } catch (error: unknown) {
    console.error('Create address error:', error);
    throw error;
  }
};

export const updateAddress = async (id: string, data: Partial<CreateAddressDto>) => {
  try {
    const res: any = await axiosClient.patch(`/address/${id}`, data);
    return res?.data ?? res;
  } catch (error: unknown) {
    console.error('Update address error:', error);
    throw error;
  }
};

export const setDefaultAddress = async (id: string) => {
  try {
    const res: any = await axiosClient.patch(`/address/${id}/default`, {});
    return res?.data ?? res;
  } catch (error: unknown) {
    console.error('Set default address error:', error);
    throw error;
  }
};

export const deleteAddress = async (id: string) => {
  try {
    const res: any = await axiosClient.delete(`/address/${id}`);
    return res?.data ?? res;
  } catch (error: unknown) {
    console.error('Delete address error:', error);
    throw error;
  }
};
