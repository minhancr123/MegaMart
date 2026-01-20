import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "src/modules/auth/auth.service";

@Injectable()

export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private config: ConfigService, private authService: AuthService) {
        super(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: config.get<string>("JWT_SECRET") || "defaultSecret"

            }
        )
    }


    async validate(payload: { sub: string, email: string }) {
        const user = await this.authService.validateUserById(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found or has been deleted');
        }

        // Return user info for use in guards/controllers (including role)
        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };
    }

}