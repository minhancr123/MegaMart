import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Extend với Accelerate để có caching
  get accelerated() {
    return this.$extends(withAccelerate());
  }

  // Proxy methods cho các model chính
  get user() { return this.user; }
  get product() { return this.product; }
  get category() { return this.category; }
  get order() { return this.order; }
  get orderItem() { return this.orderItem; }
  get cart() { return this.cart; }
  get cartItem() { return this.cartItem; }
  get payment() { return this.payment; }
  get productVariant() { return this.productVariant; }
  get review() { return this.review; }
}
