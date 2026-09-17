-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN', 'SUPPLIER', 'SHIPPER');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('VNPAY', 'MOMO', 'STRIPE', 'BANK_TRANSFER', 'COD', 'OTHER', 'WALLET');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."VoucherType" AS ENUM ('PERCENT', 'FIXED', 'FREESHIP');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('NEWS', 'EVENT');

-- CreateEnum
CREATE TYPE "public"."PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."StockMovementType" AS ENUM ('IMPORT', 'EXPORT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'SALE', 'RESERVE', 'RELEASE');

-- CreateEnum
CREATE TYPE "public"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."SerialStatus" AS ENUM ('IN_STOCK', 'SOLD', 'DEFECTIVE', 'RETURNED');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('PAGE_VIEW', 'PRODUCT_VIEW', 'CATEGORY_VIEW', 'SEARCH', 'ADD_TO_CART', 'REMOVE_FROM_CART', 'ADD_TO_WISHLIST', 'CHECKOUT_START', 'CHECKOUT_COMPLETE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'REVIEW_SUBMIT', 'CLICK_BANNER', 'CLICK_FLASH_SALE', 'APPLY_VOUCHER', 'SHARE_PRODUCT', 'FILTER_PRODUCTS', 'SORT_PRODUCTS', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "name" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplierId" TEXT,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "ward" TEXT,
    "provinceId" INTEGER,
    "districtId" INTEGER,
    "wardCode" TEXT,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "descriptionImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand" TEXT,
    "categoryId" TEXT,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Variant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "salePrice" BIGINT,
    "discountPercent" INTEGER,
    "saleStartDate" TIMESTAMP(3),
    "saleEndDate" TIMESTAMP(3),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "colors" JSONB,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" BIGINT NOT NULL,
    "discountAmount" BIGINT NOT NULL DEFAULT 0,
    "voucherCode" TEXT,
    "voucherId" TEXT,
    "vatAmount" BIGINT NOT NULL DEFAULT 0,
    "shippingFee" BIGINT NOT NULL DEFAULT 0,
    "shippingCarrier" TEXT DEFAULT 'GHN',
    "shippingOrderCode" TEXT,
    "shippingFeeReal" BIGINT DEFAULT 0,
    "shippingStatus" TEXT,
    "expectedDeliveryDate" TIMESTAMP(3),
    "shippingMetadata" JSONB,
    "assignedShipperId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shippingAddress" JSONB,
    "billingAddress" JSONB,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "public"."OrderStatus",
    "toStatus" "public"."OrderStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "price" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."VoucherType" NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minOrderValue" INTEGER,
    "usageLimit" INTEGER,
    "usagePerUser" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VoucherUsage" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "images" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompareItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompareItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "thumbnail" TEXT,
    "type" "public"."PostType" NOT NULL DEFAULT 'NEWS',
    "status" "public"."PostStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settings" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL DEFAULT 'MegaMart',
    "storeDescription" TEXT DEFAULT 'Cửa hàng công nghệ hàng đầu Việt Nam',
    "email" TEXT DEFAULT 'contact@megamart.com',
    "phone" TEXT DEFAULT '1900 1234',
    "address" TEXT DEFAULT '123 Đường ABC, Quận 1, TP.HCM',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "enableReviews" BOOLEAN NOT NULL DEFAULT true,
    "enableRegistration" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "position" TEXT NOT NULL DEFAULT 'HOME_SLIDER',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "template" TEXT NOT NULL DEFAULT 'AUTO',
    "ctaText" TEXT,
    "badgeText" TEXT,
    "featuredProductIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FlashSale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FlashSaleItem" (
    "id" TEXT NOT NULL,
    "flashSaleId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "salePrice" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WarehouseInventory" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 5,
    "maxQuantity" INTEGER,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "palletId" TEXT,
    "lotId" TEXT,

    CONSTRAINT "WarehouseInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."StockMovementType" NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "supplierId" TEXT,
    "toWarehouseId" TEXT,
    "orderId" TEXT,
    "purchaseOrderId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "qcStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" BIGINT,
    "createdBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovementItem" (
    "id" TEXT NOT NULL,
    "stockMovementId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "orderedQty" INTEGER,
    "qcPassedQty" INTEGER,
    "qcFailedQty" INTEGER NOT NULL DEFAULT 0,
    "qcNote" TEXT,
    "putawayLocation" TEXT,
    "palletId" TEXT,
    "lotId" TEXT,
    "lotCode" TEXT,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "serials" JSONB,
    "unitPrice" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "public"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "totalAmount" BIGINT,
    "createdBy" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedNote" TEXT,
    "shipmentStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "shipmentProgress" INTEGER NOT NULL DEFAULT 0,
    "shipmentUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" BIGINT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pallet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxLevels" INTEGER NOT NULL DEFAULT 4,
    "maxWeight" INTEGER DEFAULT 500,
    "maxVolume" DOUBLE PRECISION,
    "qcStatus" TEXT,
    "qcNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lot" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "initialQty" INTEGER NOT NULL DEFAULT 0,
    "mfgDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SerialNumber" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "lotId" TEXT,
    "status" "public"."SerialStatus" NOT NULL DEFAULT 'IN_STOCK',
    "orderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerialNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PalletBox" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "boxCode" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "slotIndex" INTEGER,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "tareWeight" DOUBLE PRECISION,
    "netWeight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "barcode" TEXT,
    "poNumber" TEXT,
    "exportPurpose" TEXT,
    "exportTicketCode" TEXT,
    "sealedBy" TEXT,
    "sealedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PalletBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShipmentEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "ghnCode" TEXT,
    "status" TEXT NOT NULL,
    "statusName" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'TRACKING',
    "message" TEXT,
    "occurredAt" TIMESTAMP(3),
    "raw" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "note" TEXT,
    "capturedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefundRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MANUAL',
    "channel" TEXT,
    "idempotencyKey" TEXT,
    "externalRefundId" TEXT,
    "failureReason" TEXT,
    "rawResponse" JSONB,
    "bankInfo" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShipperProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipperProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceBefore" BIGINT NOT NULL,
    "balanceAfter" BIGINT NOT NULL,
    "orderId" TEXT,
    "refundRequestId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "eventType" "public"."EventType" NOT NULL,
    "eventName" TEXT NOT NULL,
    "metadata" JSONB,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "referrer" TEXT,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "idempotencyKey" TEXT,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RedeemedVoucher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "rewardTemplateId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedeemedVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LoyaltyNurtureQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voucherId" TEXT,
    "segment" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyNurtureQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentJobConfig" (
    "jobId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "batchSize" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentJobConfig_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "public"."DailyVariantSale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "variantId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "revenue" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyVariantSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_isDefault_idx" ON "public"."Address"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "public"."Product"("slug");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "public"."Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "public"."ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductImage_isPrimary_idx" ON "public"."ProductImage"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "public"."Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "public"."Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_active_idx" ON "public"."Category"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_sku_key" ON "public"."Variant"("sku");

-- CreateIndex
CREATE INDEX "Variant_sku_idx" ON "public"."Variant"("sku");

-- CreateIndex
CREATE INDEX "Variant_productId_idx" ON "public"."Variant"("productId");

-- CreateIndex
CREATE INDEX "Variant_saleStartDate_saleEndDate_idx" ON "public"."Variant"("saleStartDate", "saleEndDate");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "public"."CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_variantId_idx" ON "public"."CartItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "public"."CartItem"("cartId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_code_key" ON "public"."Order"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shippingOrderCode_key" ON "public"."Order"("shippingOrderCode");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "public"."Order"("userId", "status");

-- CreateIndex
CREATE INDEX "Order_assignedShipperId_idx" ON "public"."Order"("assignedShipperId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "public"."Order"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_code_idx" ON "public"."Order"("code");

-- CreateIndex
CREATE INDEX "Order_voucherId_idx" ON "public"."Order"("voucherId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "public"."OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_createdAt_idx" ON "public"."OrderStatusHistory"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "public"."OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "public"."Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "public"."Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_code_idx" ON "public"."Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_active_idx" ON "public"."Voucher"("active");

-- CreateIndex
CREATE INDEX "Voucher_startDate_idx" ON "public"."Voucher"("startDate");

-- CreateIndex
CREATE INDEX "Voucher_endDate_idx" ON "public"."Voucher"("endDate");

-- CreateIndex
CREATE INDEX "VoucherUsage_voucherId_idx" ON "public"."VoucherUsage"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherUsage_userId_idx" ON "public"."VoucherUsage"("userId");

-- CreateIndex
CREATE INDEX "VoucherUsage_orderId_idx" ON "public"."VoucherUsage"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherUsage_voucherId_userId_orderId_key" ON "public"."VoucherUsage"("voucherId", "userId", "orderId");

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "public"."Review"("productId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "public"."Review"("userId");

-- CreateIndex
CREATE INDEX "Review_approved_idx" ON "public"."Review"("approved");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "public"."WishlistItem"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "public"."WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "public"."WishlistItem"("userId", "productId");

-- CreateIndex
CREATE INDEX "CompareItem_userId_idx" ON "public"."CompareItem"("userId");

-- CreateIndex
CREATE INDEX "CompareItem_productId_idx" ON "public"."CompareItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_userId_productId_key" ON "public"."CompareItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_slug_idx" ON "public"."Post"("slug");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "public"."Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "public"."Post"("status");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "public"."Post"("type");

-- CreateIndex
CREATE INDEX "Post_publishedAt_idx" ON "public"."Post"("publishedAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "public"."Post"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "public"."Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "public"."Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_slug_idx" ON "public"."Tag"("slug");

-- CreateIndex
CREATE INDEX "PostTag_postId_idx" ON "public"."PostTag"("postId");

-- CreateIndex
CREATE INDEX "PostTag_tagId_idx" ON "public"."PostTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PostTag_postId_tagId_key" ON "public"."PostTag"("postId", "tagId");

-- CreateIndex
CREATE INDEX "Banner_active_displayOrder_idx" ON "public"."Banner"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "Banner_startDate_endDate_idx" ON "public"."Banner"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "FlashSale_active_idx" ON "public"."FlashSale"("active");

-- CreateIndex
CREATE INDEX "FlashSale_startTime_endTime_idx" ON "public"."FlashSale"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "FlashSaleItem_flashSaleId_idx" ON "public"."FlashSaleItem"("flashSaleId");

-- CreateIndex
CREATE INDEX "FlashSaleItem_variantId_idx" ON "public"."FlashSaleItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "FlashSaleItem_flashSaleId_variantId_key" ON "public"."FlashSaleItem"("flashSaleId", "variantId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "public"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "public"."Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_code_idx" ON "public"."Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_isActive_idx" ON "public"."Warehouse"("isActive");

-- CreateIndex
CREATE INDEX "WarehouseInventory_warehouseId_idx" ON "public"."WarehouseInventory"("warehouseId");

-- CreateIndex
CREATE INDEX "WarehouseInventory_variantId_idx" ON "public"."WarehouseInventory"("variantId");

-- CreateIndex
CREATE INDEX "WarehouseInventory_quantity_idx" ON "public"."WarehouseInventory"("quantity");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseInventory_warehouseId_variantId_key" ON "public"."WarehouseInventory"("warehouseId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "public"."Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_code_idx" ON "public"."Supplier"("code");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "public"."Supplier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_code_key" ON "public"."StockMovement"("code");

-- CreateIndex
CREATE INDEX "StockMovement_code_idx" ON "public"."StockMovement"("code");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "public"."StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "public"."StockMovement"("warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_supplierId_idx" ON "public"."StockMovement"("supplierId");

-- CreateIndex
CREATE INDEX "StockMovement_status_idx" ON "public"."StockMovement"("status");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "public"."StockMovement"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "StockMovementItem_stockMovementId_idx" ON "public"."StockMovementItem"("stockMovementId");

-- CreateIndex
CREATE INDEX "StockMovementItem_variantId_idx" ON "public"."StockMovementItem"("variantId");

-- CreateIndex
CREATE INDEX "StockMovementItem_palletId_idx" ON "public"."StockMovementItem"("palletId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "public"."PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_code_idx" ON "public"."PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "public"."PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_warehouseId_idx" ON "public"."PurchaseOrder"("warehouseId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "public"."PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "public"."PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_variantId_idx" ON "public"."PurchaseOrderItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_code_key" ON "public"."Pallet"("code");

-- CreateIndex
CREATE INDEX "Pallet_warehouseId_idx" ON "public"."Pallet"("warehouseId");

-- CreateIndex
CREATE INDEX "Pallet_code_idx" ON "public"."Pallet"("code");

-- CreateIndex
CREATE INDEX "Pallet_status_idx" ON "public"."Pallet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_code_key" ON "public"."Lot"("code");

-- CreateIndex
CREATE INDEX "Lot_variantId_idx" ON "public"."Lot"("variantId");

-- CreateIndex
CREATE INDEX "Lot_warehouseId_idx" ON "public"."Lot"("warehouseId");

-- CreateIndex
CREATE INDEX "Lot_expiryDate_idx" ON "public"."Lot"("expiryDate");

-- CreateIndex
CREATE INDEX "Lot_status_idx" ON "public"."Lot"("status");

-- CreateIndex
CREATE INDEX "Lot_code_idx" ON "public"."Lot"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SerialNumber_serial_key" ON "public"."SerialNumber"("serial");

-- CreateIndex
CREATE INDEX "SerialNumber_variantId_idx" ON "public"."SerialNumber"("variantId");

-- CreateIndex
CREATE INDEX "SerialNumber_lotId_idx" ON "public"."SerialNumber"("lotId");

-- CreateIndex
CREATE INDEX "SerialNumber_status_idx" ON "public"."SerialNumber"("status");

-- CreateIndex
CREATE INDEX "SerialNumber_serial_idx" ON "public"."SerialNumber"("serial");

-- CreateIndex
CREATE INDEX "PalletBox_palletId_idx" ON "public"."PalletBox"("palletId");

-- CreateIndex
CREATE INDEX "PalletBox_level_idx" ON "public"."PalletBox"("level");

-- CreateIndex
CREATE UNIQUE INDEX "PalletBox_palletId_boxCode_key" ON "public"."PalletBox"("palletId", "boxCode");

-- CreateIndex
CREATE INDEX "ShipmentEvent_orderId_createdAt_idx" ON "public"."ShipmentEvent"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShipmentEvent_orderId_status_idx" ON "public"."ShipmentEvent"("orderId", "status");

-- CreateIndex
CREATE INDEX "DeliveryProof_orderId_createdAt_idx" ON "public"."DeliveryProof"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_idempotencyKey_key" ON "public"."RefundRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RefundRequest_orderId_status_idx" ON "public"."RefundRequest"("orderId", "status");

-- CreateIndex
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "public"."RefundRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ShipperProfile_userId_key" ON "public"."ShipperProfile"("userId");

-- CreateIndex
CREATE INDEX "ShipperProfile_isActive_idx" ON "public"."ShipperProfile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_refundRequestId_key" ON "public"."WalletTransaction"("refundRequestId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "public"."WalletTransaction"("walletId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WalletTransaction_orderId_idx" ON "public"."WalletTransaction"("orderId");

-- CreateIndex
CREATE INDEX "UserEvent_userId_idx" ON "public"."UserEvent"("userId");

-- CreateIndex
CREATE INDEX "UserEvent_sessionId_idx" ON "public"."UserEvent"("sessionId");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_idx" ON "public"."UserEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserEvent_eventName_idx" ON "public"."UserEvent"("eventName");

-- CreateIndex
CREATE INDEX "UserEvent_createdAt_idx" ON "public"."UserEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTransaction_idempotencyKey_key" ON "public"."LoyaltyTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_userId_createdAt_idx" ON "public"."LoyaltyTransaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "public"."LoyaltyTransaction"("orderId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_idempotencyKey_idx" ON "public"."LoyaltyTransaction"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemedVoucher_voucherId_key" ON "public"."RedeemedVoucher"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "RedeemedVoucher_code_key" ON "public"."RedeemedVoucher"("code");

-- CreateIndex
CREATE INDEX "RedeemedVoucher_userId_createdAt_idx" ON "public"."RedeemedVoucher"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserRecommendation_userId_idx" ON "public"."UserRecommendation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecommendation_userId_productId_key" ON "public"."UserRecommendation"("userId", "productId");

-- CreateIndex
CREATE INDEX "LoyaltyNurtureQueue_userId_idx" ON "public"."LoyaltyNurtureQueue"("userId");

-- CreateIndex
CREATE INDEX "LoyaltyNurtureQueue_status_idx" ON "public"."LoyaltyNurtureQueue"("status");

-- CreateIndex
CREATE INDEX "DailyVariantSale_date_idx" ON "public"."DailyVariantSale"("date");

-- CreateIndex
CREATE INDEX "DailyVariantSale_variantId_idx" ON "public"."DailyVariantSale"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyVariantSale_date_variantId_key" ON "public"."DailyVariantSale"("date", "variantId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Variant" ADD CONSTRAINT "Variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_assignedShipperId_fkey" FOREIGN KEY ("assignedShipperId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "public"."Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoucherUsage" ADD CONSTRAINT "VoucherUsage_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "public"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoucherUsage" ADD CONSTRAINT "VoucherUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VoucherUsage" ADD CONSTRAINT "VoucherUsage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompareItem" ADD CONSTRAINT "CompareItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompareItem" ADD CONSTRAINT "CompareItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_flashSaleId_fkey" FOREIGN KEY ("flashSaleId") REFERENCES "public"."FlashSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "public"."Pallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WarehouseInventory" ADD CONSTRAINT "WarehouseInventory_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovementItem" ADD CONSTRAINT "StockMovementItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovementItem" ADD CONSTRAINT "StockMovementItem_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "public"."StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovementItem" ADD CONSTRAINT "StockMovementItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovementItem" ADD CONSTRAINT "StockMovementItem_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "public"."Pallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "public"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pallet" ADD CONSTRAINT "Pallet_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lot" ADD CONSTRAINT "Lot_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lot" ADD CONSTRAINT "Lot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "public"."Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lot" ADD CONSTRAINT "Lot_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SerialNumber" ADD CONSTRAINT "SerialNumber_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SerialNumber" ADD CONSTRAINT "SerialNumber_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "public"."Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PalletBox" ADD CONSTRAINT "PalletBox_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "public"."Pallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PalletBox" ADD CONSTRAINT "PalletBox_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryProof" ADD CONSTRAINT "DeliveryProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RefundRequest" ADD CONSTRAINT "RefundRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShipperProfile" ADD CONSTRAINT "ShipperProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RedeemedVoucher" ADD CONSTRAINT "RedeemedVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RedeemedVoucher" ADD CONSTRAINT "RedeemedVoucher_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "public"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRecommendation" ADD CONSTRAINT "UserRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRecommendation" ADD CONSTRAINT "UserRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyNurtureQueue" ADD CONSTRAINT "LoyaltyNurtureQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LoyaltyNurtureQueue" ADD CONSTRAINT "LoyaltyNurtureQueue_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "public"."Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyVariantSale" ADD CONSTRAINT "DailyVariantSale_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

