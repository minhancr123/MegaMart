import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/guards/auth.gaurd';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('categories')
@Controller('products/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    try {
      const category = await this.categoryService.create(createCategoryDto);
      return {
        success: true,
        data: category,
        message: 'Tạo danh mục thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi tạo danh mục', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  async findAll() {
    try {
      const categories = await this.categoryService.findAll();
      return {
        success: true,
        data: categories,
        message: 'Lấy danh sách danh mục thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy danh sách danh mục', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id') id: string) {
    try {
      const category = await this.categoryService.findOne(id);
      if (!category) {
        throw new HttpException(
          { success: false, message: 'Không tìm thấy danh mục' },
          HttpStatus.NOT_FOUND
        );
      }
      return {
        success: true,
        data: category,
        message: 'Lấy thông tin danh mục thành công'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: 'Lỗi khi lấy thông tin danh mục', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update category' })
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    try {
      const category = await this.categoryService.update(id, updateCategoryDto);
      return {
        success: true,
        data: category,
        message: 'Cập nhật danh mục thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi cập nhật danh mục', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete category' })
  async remove(@Param('id') id: string) {
    try {
      await this.categoryService.remove(id);
      return {
        success: true,
        message: 'Xóa danh mục thành công'
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Lỗi khi xóa danh mục', detail: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
