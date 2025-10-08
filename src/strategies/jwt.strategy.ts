import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "src/modules/auth/auth.service";

@Injectable()

export class JwtStrategy extends PassportStrategy(Strategy){
    constructor(private config: ConfigService ,private authService : AuthService){
        super(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey : config.get<string>("JWT_SECRET") || "defaultSecret"
            
            }
        )
    }


    async validate(payload : {sub : string , email : string}){
        return {userId : payload.sub , email : payload.email};
    }
        
    // async validate(email : string, password : string) {
    //     const user =await this.authService.validateUser(email , password);
    //     if(!user){
    //         throw new UnauthorizedException();
    //     }
    //     return user;
    // }

}