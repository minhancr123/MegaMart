import axiosClient from "./axiosClient";

export interface Settings {
  id: string;
  storeName: string;
  storeDescription?: string;
  email?: string;
  phone?: string;
  address?: string;
  maintenanceMode: boolean;
  enableReviews: boolean;
  enableRegistration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSettingsDto {
  storeName?: string;
  storeDescription?: string;
  email?: string;
  phone?: string;
  address?: string;
  maintenanceMode?: boolean;
  enableReviews?: boolean;
  enableRegistration?: boolean;
}

export const getSettings = async (): Promise<Settings> => {
  const response = await axiosClient.get("/settings");
  return response.data;
};

export const updateSettings = async (data: UpdateSettingsDto): Promise<Settings> => {
  const response = await axiosClient.put("/settings", data);
  return response.data;
};
