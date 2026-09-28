import { Controller, Post, Body, Req } from "@nestjs/common";
import type { Request } from "express";
import { AiService } from "./ai.service";
import { verifyJWT } from "../../utils/verifyJWT.util";
import { IsString, IsArray, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ConversationMessage {
  @IsString()
  role: "user" | "assistant";

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

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  async chat(@Body() chatDto: ChatDto, @Req() req: Request) {
    try {
      const { message, conversationHistory = [] } = chatDto;

      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: "Message is required",
        };
      }

      // Optional auth: có JWT hợp lệ thì tra đơn của chính chủ; không có hoặc
      // hết hạn thì coi như khách vãng lai (không 401 để khỏi đá văng user).
      // TUYỆT ĐỐI không nhận userId từ body (tránh IDOR đọc đơn người khác).
      let userId: string | undefined;
      try {
        const auth = req.headers.authorization || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (token) {
          const payload: any = await verifyJWT(token);
          userId = payload?.sub || payload?.userId || undefined;
        }
      } catch {
        userId = undefined;
      }

      const response = await this.aiService.chat(message, conversationHistory, userId);

      return {
        success: true,
        message: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau! 😅",
      };
    }
  }

  @Post("search-products")
  async searchProducts(@Body() body: SearchProductsDto) {
    try {
      const { query, limit = 5 } = body;

      if (!query || query.trim().length === 0) {
        return {
          success: false,
          error: "Query is required",
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
