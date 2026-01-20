import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PostType {
    NEWS = 'NEWS',
    EVENT = 'EVENT',
}

export enum PostStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}

export class CreatePostDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    content: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    thumbnail?: string;

    @ApiProperty({ enum: PostType, default: PostType.NEWS })
    @IsOptional()
    @IsEnum(PostType)
    type?: PostType;

    @ApiProperty({ enum: PostStatus, default: PostStatus.DRAFT })
    @IsOptional()
    @IsEnum(PostStatus)
    status?: PostStatus;
}
