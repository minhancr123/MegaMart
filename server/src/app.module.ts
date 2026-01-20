import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
import { SettingsModule } from "./modules/settings/settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    SettingsModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
