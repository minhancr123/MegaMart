import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
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
import { ShippingModule } from "./modules/shipping/shipping.module";
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
import { AiModule } from "./modules/ai/ai.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { RefundModule } from "./modules/refund/refund.module";
import { ShippersModule } from "./modules/shippers/shippers.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { AgentModule } from "./modules/agent/agent.module";
import { InngestModule } from "./modules/inngest/inngest.module";
import { RecommendationModule } from "./modules/recommendation/recommendation.module";
import { LoyaltyNurtureModule } from "./modules/loyalty-nurture/loyalty-nurture.module";
import { AgentJobsModule } from "./modules/agent-jobs/agent-jobs.module";
import { CrmModule } from "./modules/crm/crm.module";
import { EmailModule } from "./modules/email/email.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // Rate Limiting - Chống spam/DDoS
    // Lưu ý: frontend burst 5-10 requests khi load trang (StrictMode dev còn
    // nhân đôi), nên limit phải cao hơn burst bình thường. Flood thật (100+/s)
    // vẫn bị chặn. Riêng endpoint auth cần siết riêng (việc sau).
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 giây
        limit: 15, // Max 15 requests/giây (cũ: 3 — chặn cả user thường)
      },
      {
        name: "medium",
        ttl: 10000, // 10 giây
        limit: 100, // Max 100 requests/10 giây (cũ: 20)
      },
      {
        name: "long",
        ttl: 60000, // 1 phút
        limit: 600, // Max 600 requests/phút (cũ: 100)
      },
    ]),
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    ShippingModule,
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
    AiModule,
    WalletModule,
    RefundModule,
    ShippersModule,
    LoyaltyModule,
    AgentModule, // Multi-agent crew (LangGraph): researcher → writer ⇄ reviewer
    InngestModule, // Durable runtime: cron + step checkpoint + resume
    RecommendationModule, // GET /api/recommendations/me
    LoyaltyNurtureModule, // Admin duyệt hàng chờ loyalty
    AgentJobsModule, // Admin bật/tắt + batch agent jobs
    CrmModule, // CRM: Customer 360, tags, notes, timeline, segments
    EmailModule, // Mail thương hiệu dùng chung (invoice, reminder, voucher, promo)
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
