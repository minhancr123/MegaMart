import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
    constructor(private readonly postsService: PostsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new post' })
    create(@Request() req, @Body() createPostDto: CreatePostDto) {
        const userId = req.user.userId || req.user.id;
        return this.postsService.create(userId, createPostDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all posts' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'type', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    findAll(@Query() query: any) {
        return this.postsService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get post by ID' })
    findOne(@Param('id') id: string) {
        return this.postsService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get post by Slug' })
    findBySlug(@Param('slug') slug: string) {
        return this.postsService.findBySlug(slug);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update post' })
    update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
        return this.postsService.update(id, updatePostDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete post' })
    remove(@Param('id') id: string) {
        return this.postsService.remove(id);
    }
}
