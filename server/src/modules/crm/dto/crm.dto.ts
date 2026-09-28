import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CrmCustomerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["CHAMPION", "LOYAL", "POTENTIAL", "AT_RISK", "DORMANT", "NEW"])
  segment?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minHealthScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxHealthScore?: number;

  @IsOptional()
  @IsString()
  tagId?: string;
}

export class CreateCustomerTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignCustomerTagDto {
  @IsString()
  @IsNotEmpty()
  tagId: string;
}

export class CreateCustomerNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class BulkTagDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @IsNotEmpty()
  tagId: string;
}

export class IssueVoucherDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(["PERCENT", "FIXED", "FREESHIP"])
  type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  value: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderValue?: number;
}

export class BulkPointsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  userIds: string[];

  @Type(() => Number)
  @IsInt()
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BroadcastPromotionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsIn(["ALL", "RECENT_BUYERS"])
  segment?: "ALL" | "RECENT_BUYERS";

  @IsOptional()
  @IsString()
  tagId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;
}
