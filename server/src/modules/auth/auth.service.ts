import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { HashUtil } from 'src/utils/hash.util';
import { User } from '@prisma/client';
import { CreateUserDto, UserResponseDto } from '../users/dto/user.dto';


@Injectable()
export class AuthService {
  constructor(private userService: UsersService, private JwtService: JwtService) {

  }

  // auth.service.ts
  async validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new Error('Người dùng không tồn tại');

    const isValid = await HashUtil.compare(password, user.passwordHash);
    if (!isValid) throw new Error('Thông tin đăng nhập không hợp lệ');

    // const { passwordHash, ...safeUser } = user;
    return user;
  }

  async signIn(user: User): Promise<{ accessToken: string; user: UserResponseDto }> {
    const { passwordHash, ...safeUser } = user;
    const payload = { email: safeUser.email, sub: safeUser.id };
    const accessToken = await this.JwtService.signAsync(payload);
    return { accessToken, user: safeUser };
  }


  async signUp(email: string, name: string, password: string): Promise<{ status: number, message: string, newUser?: any }> {
    const userExists = await this.userService.findByEmail(email);
    if (userExists) {
      return { status: 0, message: 'Người dùng đã tồn tại' };
    }
    // Không cần hash ở đây vì UsersService đã hash rồi
    const newUser = await this.userService.create({ email, name, password });
    return { status: 1, message: 'Đăng ký thành công', newUser };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userService.findOne(userId);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async validateUserById(userId: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) return null;

      const { passwordHash, ...safeUser } = user;
      return safeUser;
    } catch (error) {
      return null;
    }
  }


  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
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
