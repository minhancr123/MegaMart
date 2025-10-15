import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateUserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private readonly authService;
    private userService;
    constructor(authService: AuthService, userService: UsersService);
    create(createAuthDto: CreateAuthDto): string;
    findAll(): string;
    signIn(req: any): Promise<{
        success: boolean;
        accessToken: string;
        user: import("../users/dto/user.dto").UserResponseDto;
        message: string;
    }>;
    signUp(signUpDto: CreateUserDto): Promise<{
        success: boolean;
        message: string;
        user: any;
    }>;
    getProfile(req: any): Promise<{
        success: boolean;
        message: string;
        user: any;
    }>;
    findOne(id: string): string;
    update(id: string, updateAuthDto: UpdateAuthDto): string;
    remove(id: string): string;
}
