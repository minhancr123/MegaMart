import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';

/**
 * Chỉ tài khoản role SUPPLIER đã link nhà cung cấp mới qua được.
 * Gắn req.supplierId để controller scope đúng PO của NCC đó.
 */
@Injectable()
export class SupplierGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'SUPPLIER') {
      throw new ForbiddenException('Chỉ tài khoản nhà cung cấp mới có quyền truy cập');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, supplierId: true, role: true },
    });

    if (!dbUser || dbUser.role !== 'SUPPLIER' || !dbUser.supplierId) {
      throw new ForbiddenException('Tài khoản chưa được gắn nhà cung cấp');
    }

    request.supplierId = dbUser.supplierId;
    return true;
  }
}
