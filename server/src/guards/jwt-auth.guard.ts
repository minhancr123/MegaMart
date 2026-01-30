import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { verifyJWT } from 'src/utils/verifyJWT.util';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
    constructor(private prisma: PrismaService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth) return false;
        const token = auth.split(' ')[1];
        if (!token) return false;
        try {
            const payload = await verifyJWT(token);
            
            // Fetch user to get full details (like JwtStrategy does)
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub as string },
                select: { id: true, email: true, role: true, name: true }
            });
            
            if (!user) return false;
            
            // Set req.user with consistent format
            req.user = {
                userId: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
            };
            
            return true;
        } catch (error) {
            return false;
        }
    }
}

