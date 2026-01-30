import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prismaClient/prisma.service";
import { PrismaModule } from "./prismaClient/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ProductsModule } from "./modules/products/products.module";
import { CartModule } from "./modules/cart/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { AddressModule } from "./modules/address/address.module";
import { CartController } from "./modules/cart/cart.controller";
import { VoucherModule } from "./modules/vouchers/voucher.module";
import { ReviewModule } from "./modules/reviews/review.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { CompareModule } from "./modules/compare/compare.module";
import { ImageSyncModule } from "./modules/images/image-sync.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { PostsModule } from "./modules/posts/posts.module";
import { TagsModule } from "./modules/tags/tags.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { AuditLogModule } from "./modules/audit-log/audit-log.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CategoryModule } from "./modules/category/category.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting - Chống spam/DDoS
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,    // 1 giây
      limit: 3,     // Max 3 requests/giây
    }, {
      name: 'medium',
      ttl: 10000,   // 10 giây
      limit: 20,    // Max 20 requests/10 giây
    }, {
      name: 'long',
      ttl: 60000,   // 1 phút
      limit: 100,   // Max 100 requests/phút
    }]),
    AuthModule, 
    UsersModule, 
    ProductsModule, 
    CartModule,
    OrdersModule,
    PaymentModule,
    AddressModule,
    VoucherModule,
    ReviewModule,
    WishlistModule,
    CompareModule,
    ImageSyncModule,
    AnalyticsModule,
    PostsModule,
    TagsModule,
    SettingsModule,
    MarketingModule,
    AuditLogModule,
    InventoryModule,
    CategoryModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
