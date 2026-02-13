import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ConversationMessage {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessage)
  conversationHistory?: ConversationMessage[];
}

export class SearchProductsDto {
  @IsString()
  query: string;

  @IsOptional()
  limit?: number;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatDto) {
    try {
      const { message, conversationHistory = [] } = chatDto;

      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message is required',
        };
      }

      const response = await this.aiService.chat(message, conversationHistory);

      return {
        success: true,
        message: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau! 😅',
      };
    }
  }

  @Post('search-products')
  async searchProducts(@Body() body: SearchProductsDto) {
    try {
      const { query, limit = 5 } = body;
      
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: 'Query is required',
        };
      }

      const products = await this.aiService.searchProducts(query, limit);

      return {
        success: true,
        products,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
