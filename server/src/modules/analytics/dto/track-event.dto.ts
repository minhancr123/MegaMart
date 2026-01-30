import { IsEnum, IsString, IsOptional, IsObject } from 'class-validator';

export enum EventType {
  PAGE_VIEW = 'PAGE_VIEW',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  CATEGORY_VIEW = 'CATEGORY_VIEW',
  SEARCH = 'SEARCH',
  ADD_TO_CART = 'ADD_TO_CART',
  REMOVE_FROM_CART = 'REMOVE_FROM_CART',
  ADD_TO_WISHLIST = 'ADD_TO_WISHLIST',
  CHECKOUT_START = 'CHECKOUT_START',
  CHECKOUT_COMPLETE = 'CHECKOUT_COMPLETE',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REVIEW_SUBMIT = 'REVIEW_SUBMIT',
  CLICK_BANNER = 'CLICK_BANNER',
  CLICK_FLASH_SALE = 'CLICK_FLASH_SALE',
  APPLY_VOUCHER = 'APPLY_VOUCHER',
  SHARE_PRODUCT = 'SHARE_PRODUCT',
  FILTER_PRODUCTS = 'FILTER_PRODUCTS',
  SORT_PRODUCTS = 'SORT_PRODUCTS',
  CUSTOM = 'CUSTOM',
}

export class TrackEventDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsString()
  eventName: string;

  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;
}
