import axiosClient from "./axiosClient";

export interface ShippingTrackLog {
  status: string;
  statusName: string;
  time: string | null;
}

export interface ShippingTracking {
  found: boolean;
  orderCode: string;
  carrier: string;
  trackingCode?: string;
  status?: string;
  statusName?: string;
  expectedDelivery?: string | null;
  logs?: ShippingTrackLog[];
  message?: string;
}

/** Tra cứu hành trình đơn hàng trên GHN qua backend (giữ Token ở server). */
export const trackShippingOrder = async (orderCode: string): Promise<ShippingTracking> => {
  const res: any = await axiosClient.get(`/shipping/track/${encodeURIComponent(orderCode)}`);
  return (res?.data ?? res) as ShippingTracking;
};

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  NameExtension?: string[];
}

export interface GhnDistrict {
  DistrictID: number;
  DistrictName: string;
  ProvinceID: number;
}

export interface GhnWard {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}

const unwrapList = <T>(res: any): T[] => {
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : [];
};

export const getGhnProvinces = async (): Promise<GhnProvince[]> => {
  const res: any = await axiosClient.get('/shipping/master-data/provinces');
  return unwrapList<GhnProvince>(res);
};

export const getGhnDistricts = async (provinceId: number): Promise<GhnDistrict[]> => {
  const res: any = await axiosClient.get(`/shipping/master-data/districts?provinceId=${provinceId}`);
  return unwrapList<GhnDistrict>(res);
};

export const getGhnWards = async (districtId: number): Promise<GhnWard[]> => {
  const res: any = await axiosClient.get(`/shipping/master-data/wards?districtId=${districtId}`);
  return unwrapList<GhnWard>(res);
};

export interface GhnFeeQuote {
  fee: number;
  breakdown: { serviceFee: number; insuranceFee: number; surcharges?: any };
}

export const calculateGhnFee = async (dto: {
  toDistrictId: number;
  toWardCode: string;
  weight?: number;
  insuranceValue?: number;
}): Promise<GhnFeeQuote> => {
  const res: any = await axiosClient.post('/shipping/calculate-fee', dto);
  return (res?.data ?? res) as GhnFeeQuote;
};

/** Admin: tạo đơn vận chuyển GHN cho đơn hàng (trả về order đã cập nhật). */
export const createGhnShipment = async (
  orderId: string,
  dto: {
    weight?: number;
    note?: string;
    requiredNote?: string;
    provinceId?: number | null;
    districtId?: number | null;
    wardCode?: string | null;
  } = {},
): Promise<any> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/ghn-shipment`, dto);
  return res?.data ?? res;
};

/** Admin: hủy đơn vận chuyển GHN (dọn cước staging). */
export const cancelGhnShipment = async (orderId: string): Promise<any> => {
  const res: any = await axiosClient.delete(`/orders/${orderId}/ghn-shipment`);
  return res?.data ?? res;
};

/** Admin: lấy link in vận đơn GHN A5. */
export const printGhnShipment = async (orderId: string): Promise<{ token: string; printUrl: string }> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/print-ghn`);
  return (res?.data ?? res) as { token: string; printUrl: string };
};

/** Admin: bàn giao đơn đã in vận đơn cho shipper, chuyển sang SHIPPING. */
export const handoverGhnShipment = async (orderId: string, shipperId?: string): Promise<any> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/handover-shipper`, { shipperId });
  return res?.data ?? res;
};

/** Admin: phân công lại shipper ngẫu nhiên. */
export const reassignShipper = async (orderId: string): Promise<any> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/reassign-shipper`);
  return res?.data ?? res;
};

export interface ShipmentTimelineEvent {
  id: string;
  ghnCode?: string | null;
  status: string;
  kind: string;
  message?: string | null;
  occurredAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface DeliveryProofItem {
  id: string;
  photoUrls: string[];
  note?: string | null;
  capturedBy?: string | null;
  createdAt: string;
}

export interface RefundRequestItem {
  id: string;
  amount: number | string;
  reason: string;
  method: string;
  channel?: string | null;
  failureReason?: string | null;
  idempotencyKey?: string | null;
  externalRefundId?: string | null;
  bankInfo?: any;
  status: string;
  reviewedNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Timeline vận chuyển: GHN events + ảnh POD + lịch sử trạng thái đơn. */
export const getShipmentTimeline = async (orderId: string): Promise<{ events: ShipmentTimelineEvent[]; proofs: DeliveryProofItem[]; history: any[] }> => {
  const res: any = await axiosClient.get(`/orders/${orderId}/shipment-timeline`);
  return (res?.data ?? res) as any;
};

/** Admin ghi chú vận hành lên timeline. */
export const addShipmentNote = async (orderId: string, message: string): Promise<ShipmentTimelineEvent> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/shipment-note`, { message });
  return (res?.data ?? res) as ShipmentTimelineEvent;
};

/** Shipper/Admin chụp ảnh xác nhận đã giao (multipart, tối đa 5 ảnh). */
export const updateShipperLocation = async (
  orderId: string,
  dto: { lat: number; lng: number; accuracy?: number | null },
): Promise<ShipmentTimelineEvent> => {
  const res: any = await axiosClient.patch(`/orders/${orderId}/shipper-location`, dto);
  return (res?.data ?? res) as ShipmentTimelineEvent;
};

export const uploadDeliveryProof = async (orderId: string, photos: File[], note?: string): Promise<DeliveryProofItem> => {
  const form = new FormData();
  photos.slice(0, 5).forEach((f) => form.append('photos', f));
  if (note) form.append('note', note);
  const res: any = await axiosClient.post(`/orders/${orderId}/delivery-proof`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return (res?.data ?? res) as DeliveryProofItem;
};

/** Tạo yêu cầu hoàn tiền (chỉ khi đã có thanh toán PAID). */
export const requestRefund = async (
  orderId: string,
  dto: { reason: string; method?: string; bankInfo?: any; amount?: number },
): Promise<RefundRequestItem> => {
  const res: any = await axiosClient.post(`/orders/${orderId}/refund-requests`, dto);
  return (res?.data ?? res) as RefundRequestItem;
};

export const listRefundRequests = async (orderId: string): Promise<RefundRequestItem[]> => {
  const res: any = await axiosClient.get(`/orders/${orderId}/refund-requests`);
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : [];
};

/** Admin duyệt/từ chối/hoàn tất yêu cầu hoàn tiền. */
export const reviewRefundRequest = async (
  requestId: string,
  dto: { action: 'approve' | 'reject' | 'complete'; note?: string },
): Promise<RefundRequestItem> => {
  const res: any = await axiosClient.patch(`/orders/refund-requests/${requestId}/review`, dto);
  return (res?.data ?? res) as RefundRequestItem;
};

export interface DeliveryQueueItem {
  id: string;
  productName: string;
  quantity: number;
  price?: string | number | null;
  sku?: string | null;
  attributes?: Record<string, unknown> | null;
  imageUrl?: string | null;
}

export interface DeliveryQueueOrder {
  id: string;
  code: string;
  status: string;
  total: string | number;
  shippingOrderCode?: string | null;
  shippingStatus?: string | null;
  expectedDeliveryDate?: string | null;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    province?: string;
    district?: string;
    ward?: string;
    lat?: number | null;
    lng?: number | null;
    note?: string;
  } | null;
  createdAt: string;
  assignedShipperId?: string | null;
  assignedShipper?: {
    id: string;
    name: string | null;
    phone: string | null;
    vehiclePlate: string | null;
    avatarUrl: string | null;
  } | null;
  payments?: Array<{ provider: string; status: string; amount?: string | number }>;
  items?: DeliveryQueueItem[];
  proofs?: DeliveryProofItem[];
  _count?: { items: number };
}

/** Admin: giả lập bắn Webhook GHN để test chuyển trạng thái tự động. */
export const simulateGhnWebhook = async (dto: {
  orderCode?: string;
  ghnCode?: string;
  status: string;
}): Promise<any> => {
  const res: any = await axiosClient.post('/shipping/simulate-webhook', dto);
  return res?.data ?? res;
};

/** Lấy danh sách đơn hàng đang giao (SHIPPING) cho shipper. */
export const getDeliveryQueue = async (): Promise<DeliveryQueueOrder[]> => {
  const res: any = await axiosClient.get('/orders/delivery-queue');
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : [];
};
