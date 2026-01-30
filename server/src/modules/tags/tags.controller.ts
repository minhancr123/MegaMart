import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all tags' })
    async findAll() {
        return this.tagsService.findAll();
    }

    @Get('popular')
    @ApiOperation({ summary: 'Get popular tags (most used)' })
    async getPopular() {
        return this.tagsService.getPopular();
    }
}
