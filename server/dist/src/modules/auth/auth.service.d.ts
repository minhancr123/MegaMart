import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';
import { UserResponseDto } from '../users/dto/user.dto';
export declare class AuthService {
    private userService;
    private JwtService;
    constructor(userService: UsersService, JwtService: JwtService);
    validateUser(email: string, password: string): Promise<Omit<User, 'passwordHash'> | null>;
    signIn(user: User): Promise<{
        accessToken: string;
        user: UserResponseDto;
    }>;
    signUp(email: string, name: string, password: string): Promise<{
        status: number;
        message: string;
        newUser?: any;
    }>;
    create(createAuthDto: CreateAuthDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateAuthDto: UpdateAuthDto): string;
    remove(id: number): string;
}
