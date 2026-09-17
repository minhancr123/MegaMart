import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsIn } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Role (chỉ ADMIN được set)',
    example: 'SUPPLIER',
    required: false,
    enum: ['USER', 'SUPPLIER', 'ADMIN', 'SHIPPER'],
  })
  @IsOptional()
  @IsIn(['USER', 'SUPPLIER', 'ADMIN', 'SHIPPER'])
  role?: string;

  @ApiProperty({
    description: 'ID nhà cung cấp (bắt buộc khi role=SUPPLIER)',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Role (chỉ ADMIN được đổi)',
    required: false,
    enum: ['USER', 'SUPPLIER', 'ADMIN', 'SHIPPER'],
  })
  @IsOptional()
  @IsIn(['USER', 'SUPPLIER', 'ADMIN', 'SHIPPER'])
  role?: string;

  @ApiProperty({
    description: 'ID nhà cung cấp (bắt buộc khi role=SUPPLIER)',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'cuid_example_123',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN'],
  })
  role: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class QueryUserDto {
  @ApiProperty({
    description: 'Lọc theo vai trò (USER, ADMIN, SUPPLIER, SHIPPER)',
    required: false,
    enum: ['USER', 'ADMIN', 'SUPPLIER', 'SHIPPER'],
  })
  @IsOptional()
  @IsIn(['USER', 'ADMIN', 'SUPPLIER', 'SHIPPER'])
  role?: string;
}
