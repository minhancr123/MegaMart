import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard('local'){}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// import { Injectable, UnauthorizedException } from "@nestjs/common";
// import { PassportStrategy } from "@nestjs/passport";
// import { Strategy } from "passport-local";
// import { AuthService } from "src/modules/auth/auth.service";

