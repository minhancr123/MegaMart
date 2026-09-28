import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public readonly direct: PrismaClient;

  constructor() {
    const envDatabaseUrl = process.env.DATABASE_URL;
    let dbUrl = envDatabaseUrl?.startsWith("prisma+postgres://")
      ? process.env.DIRECT_URL
      : envDatabaseUrl || process.env.DIRECT_URL;

    // Tăng connection pool timeout và connection limit nếu dùng PostgreSQL URL
    if (dbUrl && !dbUrl.includes("connection_limit")) {
      const sep = dbUrl.includes("?") ? "&" : "?";
      dbUrl = `${dbUrl}${sep}connection_limit=25&pool_timeout=30`;
    }

    super({
      ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

    this.direct = this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // `direct` được gán trong constructor để giữ tương thích với các service đang gọi prisma.direct.
  // Client chính đã dùng kết nối Postgres trực tiếp nên không cần tạo thêm pool thứ hai.
}
