import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "src/decorators/roles.decorator";

/**
 * Guard kiểm tra @Roles(...) metadata trên handler/controller.
 * Phải dùng SAU JwtAuthGuard (vì cần req.user đã được điền sẵn).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Nếu không có @Roles thì không chặn
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user)
      throw new ForbiddenException(
        "Bạn cần đăng nhập để thực hiện thao tác này",
      );

    const userRole = String(user.role || "USER").toUpperCase();
    const allowed = requiredRoles.some(
      (r) => String(r).toUpperCase() === userRole,
    );
    if (!allowed) {
      throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
    }
    return true;
  }
}
