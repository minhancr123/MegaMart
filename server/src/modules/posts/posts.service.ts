import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';
import { CreatePostDto, PostStatus } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import slugify from 'slugify';
import { AuditLogService, AuditAction, AuditEntity } from '../audit-log/audit-log.service';

@Injectable()
export class PostsService {
    constructor(
        private prisma: PrismaService,
        private auditLogService: AuditLogService,
    ) { }

    async create(userId: string, createPostDto: CreatePostDto) {
        const slug = slugify(createPostDto.title, { lower: true, strict: true }) + '-' + Date.now();

        // Extract tags from DTO
        const { tags, ...postData } = createPostDto;

        const post = await this.prisma.post.create({
            data: {
                ...postData,
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

        // Handle tags if provided
        if (tags && tags.length > 0) {
            await this.handleTags(post.id, tags);
        }

        // Log audit
        await this.auditLogService.log(
            AuditAction.POST_CREATE,
            AuditEntity.POST,
            userId,
            post.id,
            { title: post.title, type: post.type, status: post.status },
        );

        // Return post with tags
        return this.findOne(post.id);
    }

    // Helper method to handle tags
    private async handleTags(postId: string, tagNames: string[]) {
        // Remove existing tags
        await this.prisma.postTag.deleteMany({
            where: { postId }
        });

        // Process each tag
        for (const tagName of tagNames) {
            const trimmedTag = tagName.trim();
            if (!trimmedTag) continue;

            const tagSlug = slugify(trimmedTag, { lower: true, strict: true });

            // Find or create tag
            let tag = await this.prisma.tag.findUnique({
                where: { slug: tagSlug }
            });

            if (!tag) {
                tag = await this.prisma.tag.create({
                    data: {
                        name: trimmedTag,
                        slug: tagSlug
                    }
                });
            }

            // Create PostTag relation
            await this.prisma.postTag.create({
                data: {
                    postId,
                    tagId: tag.id
                }
            });
        }
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
                },
                postTags: {
                    include: {
                        tag: true
                    }
                }
            }
        });
        if (!post) throw new NotFoundException('Post not found');
        
        // Transform postTags to simple tags array
        const { postTags, ...postData } = post;
        return {
            ...postData,
            tags: postTags.map(pt => pt.tag.name)
        };
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
                },
                postTags: {
                    include: {
                        tag: true
                    }
                }
            }
        });
        if (!post) throw new NotFoundException('Post not found');
        
        // Transform postTags to simple tags array
        const { postTags, ...postData } = post;
        return {
            ...postData,
            tags: postTags.map(pt => pt.tag.name)
        };
    }

    async update(id: string, updatePostDto: UpdatePostDto) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) throw new NotFoundException('Post not found');

        // Extract tags from DTO
        const { tags, ...updateData } = updatePostDto;

        const data: any = { ...updateData };
        if (updatePostDto.title && updatePostDto.title !== post.title) {
            data.slug = slugify(updatePostDto.title, { lower: true, strict: true }) + '-' + Date.now();
        }

        const wasPublishing = updatePostDto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED;
        if (wasPublishing) {
            data.publishedAt = new Date();
        }

        const updatedPost = await this.prisma.post.update({
            where: { id },
            data,
        });

        // Handle tags if provided
        if (tags !== undefined) {
            await this.handleTags(id, tags);
        }

        // Log audit
        const action = wasPublishing ? AuditAction.POST_PUBLISH : AuditAction.POST_UPDATE;
        await this.auditLogService.log(
            action,
            AuditEntity.POST,
            undefined,
            id,
            { 
                title: updatedPost.title,
                before: { status: post.status },
                after: { status: updatedPost.status },
            },
        );

        return this.findOne(id);
    }

    async remove(id: string) {
        const post = await this.prisma.post.findUnique({ where: { id } });
        if (!post) throw new NotFoundException('Post not found');

        await this.prisma.post.delete({ where: { id } });

        // Log audit
        await this.auditLogService.log(
            AuditAction.POST_DELETE,
            AuditEntity.POST,
            undefined,
            id,
            { title: post.title, type: post.type },
        );

        return { message: 'Post deleted successfully' };
    }
}
