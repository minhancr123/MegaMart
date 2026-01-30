import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prismaClient/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if slug already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug }
    });

    if (existingCategory) {
      throw new HttpException(
        { success: false, message: 'Slug đã tồn tại' },
        HttpStatus.BAD_REQUEST
      );
    }

    // If parentId is provided, verify it exists
    if (createCategoryDto.parentId) {
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId }
      });

      if (!parentCategory) {
        throw new HttpException(
          { success: false, message: 'Danh mục cha không tồn tại' },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description,
        image: createCategoryDto.image,
        parentId: createCategoryDto.parentId || null,
        active: createCategoryDto.active ?? true
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true
          }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image: true
          }
        },
        _count: {
          select: { products: true }
        }
      }
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy danh mục' },
        HttpStatus.NOT_FOUND
      );
    }

    // If updating slug, check if new slug already exists
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug: updateCategoryDto.slug }
      });

      if (existingCategory) {
        throw new HttpException(
          { success: false, message: 'Slug đã tồn tại' },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // If updating parentId, verify it exists and not creating circular reference
    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new HttpException(
          { success: false, message: 'Không thể đặt danh mục làm cha của chính nó' },
          HttpStatus.BAD_REQUEST
        );
      }

      const parentCategory = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId }
      });

      if (!parentCategory) {
        throw new HttpException(
          { success: false, message: 'Danh mục cha không tồn tại' },
          HttpStatus.BAD_REQUEST
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async remove(id: string) {
    // Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      throw new HttpException(
        { success: false, message: 'Không tìm thấy danh mục' },
        HttpStatus.NOT_FOUND
      );
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw new HttpException(
        { success: false, message: 'Không thể xóa danh mục có danh mục con' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new HttpException(
        { success: false, message: 'Không thể xóa danh mục có sản phẩm' },
        HttpStatus.BAD_REQUEST
      );
    }

    return this.prisma.category.delete({
      where: { id }
    });
  }
}
