export declare class CreateUserDto {
    email: string;
    password: string;
    name?: string;
}
export declare class UpdateUserDto {
    name?: string;
    email?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class UserResponseDto {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
}
