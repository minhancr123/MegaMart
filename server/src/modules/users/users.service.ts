import { Injectable, NotFoundException, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { hash, compare } from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async create(createUserDto: CreateUserDto) {
        const { email, password, name } = createUserDto;

        // Check if user already exists
        const existingUser = await this.findByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const passwordHash = await hash(password, 12);
        
        return this.prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.findOne(id);

        if (updateUserDto.email) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser && existingUser.id !== id) {
                throw new ConflictException('Email already in use');
            }
        }

        return this.prisma.user.update({
            where: { id },
            data: updateUserDto,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        
        return this.prisma.user.delete({
            where: { id },
        });
    }

    async validateUser(email: string, password: string) {
        const user = await this.findByEmail(email);
        if (!user) {
            return null;
        }

        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return null;
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    async updateAvatar(userid: string, avatarUrl: string) {
        const user = await this.findOne(userid);
        if(!user)
            throw new NotFoundException(`User with ID ${userid} not found`);

        return this.prisma.user.update({
            where: { id: userid },
            data: { avatarUrl },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        
    }
}
    