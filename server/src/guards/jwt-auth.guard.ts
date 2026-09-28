import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { verifyJWT } from "src/utils/verifyJWT.util";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth) return false;
    const token = auth.split(" ")[1];
    if (!token) return false;
    try {
      const payload = await verifyJWT(token);
      if (!payload?.sub) return false;

      req.user = {
        id: payload.sub,
        userId: payload.sub,
        email: payload.email as string,
        role: (payload.role as string) || "USER",
        name: (payload as any).name || payload.email,
      };

      return true;
    } catch {
      return false;
    }
  }
}
