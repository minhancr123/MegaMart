import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prismaClient/prisma.service';

@Injectable()
export class TagsService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.tag.findMany({
            orderBy: {
                name: 'asc'
            }
        });
    }

    async getPopular(limit: number = 10) {
        const tags = await this.prisma.tag.findMany({
            include: {
                _count: {
                    select: { postTags: true }
                }
            },
            orderBy: {
                postTags: {
                    _count: 'desc'
                }
            },
            take: limit
        });

        return tags.map(tag => ({
            ...tag,
            postCount: tag._count.postTags
        }));
    }
}
