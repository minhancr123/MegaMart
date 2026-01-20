import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';
import { CreatePostDto, PostStatus } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import slugify from 'slugify';

@Injectable()
export class PostsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createPostDto: CreatePostDto) {
        const slug = slugify(createPostDto.title, { lower: true, strict: true }) + '-' + Date.now();

        return this.prisma.post.create({
            data: {
                ...createPostDto,
                slug,
                authorId: userId,
                publishedAt: createPostDto.status === PostStatus.PUBLISHED ? new Date() : null,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            }
        });
    }

    async findAll(query: any) {
        const { page = 1, limit = 10, type, status, search } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
                where,
                skip: Number(skip),
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true
                        }
                    }
                }
            }),
            this.prisma.post.count({ where }),
        ]);

        return {
            data: posts,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string) {
        const post = await this.prisma.post.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            }
        });
        if (!post) throw new NotFoundException('Post not found');
        return post;
    }

    async findBySlug(slug: string) {
        const post = await this.prisma.post.findUnique({
            where: { slug },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true
                    }
                }
            }
        });
        if (!post) throw new NotFoundException('Post not found');
        return post;
    }

    async update(id: string, updatePostDto: UpdatePostDto) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) throw new NotFoundException('Post not found');

        const data: any = { ...updatePostDto };
        if (updatePostDto.title && updatePostDto.title !== post.title) {
            data.slug = slugify(updatePostDto.title, { lower: true, strict: true }) + '-' + Date.now();
        }

        if (updatePostDto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
            data.publishedAt = new Date();
        }

        return this.prisma.post.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return this.prisma.post.delete({ where: { id } });
    }
}
