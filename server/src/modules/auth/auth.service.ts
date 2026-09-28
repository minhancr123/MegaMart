import { Injectable } from "@nestjs/common";
import { CreateAuthDto } from "./dto/create-auth.dto";
import { UpdateAuthDto } from "./dto/update-auth.dto";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { HashUtil } from "src/utils/hash.util";
import { OAuth2Client } from "google-auth-library";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { CreateUserDto, UserResponseDto } from "../users/dto/user.dto";
import {
  AuditLogService,
  AuditAction,
  AuditEntity,
} from "../audit-log/audit-log.service";

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private JwtService: JwtService,
    private auditLogService: AuditLogService,
    private configService: ConfigService,
  ) {}

  /**
   * Đăng nhập bằng Google: verify idToken với Google, tìm user theo email
   * (có thì đăng nhập, chưa có thì tạo mới), rồi cấp JWT MegaMart.
   */
  async signInWithGoogle(
    idToken: string,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const clientId = this.configService.get("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw new Error("Chưa cấu hình GOOGLE_CLIENT_ID trong server/.env");
    }
    if (!idToken) throw new Error("Thiếu Google credential");
    const client = new OAuth2Client(clientId);
    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new Error("Xác thực Google thất bại");
    }
    if (!payload?.email || !payload?.email_verified) {
      throw new Error("Tài khoản Google chưa xác thực email");
    }
    const email = String(payload.email).toLowerCase();
    const name =
      String(payload.name || payload.given_name || email.split("@")[0] || "Google User").slice(0, 100);
    let user = await this.userService.findByEmail(email);
    if (!user) {
      // Mật khẩu ngẫu nhiên (user này chỉ đăng nhập qua Google).
      const randomPass =
        "gg-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 14);
      const created: any = await this.userService.create({
        email,
        name,
        password: randomPass,
      });
      user = await this.userService.findByEmail(email);
      if (!user) throw new Error("Không tạo được tài khoản");
      await this.auditLogService.log(
        AuditAction.USER_CREATE,
        AuditEntity.USER,
        created?.id || user.id,
        user.id,
        { email, name, via: "google" },
      );
    }
    if (user.avatarUrl == null && payload.picture) {
      try {
        await this.userService.updateAvatar(user.id, payload.picture);
      } catch {
        /* best-effort */
      }
    }
    return this.signIn(user as User);
  }

  // auth.service.ts
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, "passwordHash"> | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new Error("Người dùng không tồn tại");

    const isValid = await HashUtil.compare(password, user.passwordHash);
    if (!isValid) throw new Error("Thông tin đăng nhập không hợp lệ");

    // const { passwordHash, ...safeUser } = user;
    return user;
  }

  async signIn(
    user: User,
  ): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { passwordHash, ...safeUser } = user;
    const payload = {
      email: safeUser.email,
      sub: safeUser.id,
      role: safeUser.role || "USER", // Include role in JWT payload
      name: safeUser.name || null,
    };
    const accessToken = await this.JwtService.signAsync(payload);

    // Log login action
    await this.auditLogService.log(
      AuditAction.LOGIN,
      AuditEntity.AUTH,
      safeUser.id,
      safeUser.id,
      { email: safeUser.email, role: safeUser.role },
    );

    return { accessToken, user: safeUser };
  }

  async signUp(
    email: string,
    name: string,
    password: string,
  ): Promise<{ status: number; message: string; newUser?: any }> {
    const userExists = await this.userService.findByEmail(email);
    if (userExists) {
      return { status: 0, message: "Người dùng đã tồn tại" };
    }
    // Không cần hash ở đây vì UsersService đã hash rồi
    const newUser = await this.userService.create({ email, name, password });

    // Log signup action
    if (newUser) {
      await this.auditLogService.log(
        AuditAction.USER_CREATE,
        AuditEntity.USER,
        newUser.id, // User triggers their own creation in self-signup context
        newUser.id,
        { email, name },
      );
    }

    return { status: 1, message: "Đăng ký thành công", newUser };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    return this.userService.findOne(userId);
  }

  async validateUserById(userId: string): Promise<UserResponseDto | null> {
    try {
      return await this.userService.findOne(userId);
    } catch (error) {
      return null;
    }
  }

  create(createAuthDto: CreateAuthDto) {
    return "This action adds a new auth";
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
