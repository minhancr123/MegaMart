import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(["VOUCHER", "LOYALTY_POINTS", "NOTIFICATION"])
  type: string;

  @IsIn(["MANUAL", "ON_SIGNUP", "HEALTH_DROP", "BIRTHDAY", "ABANDONED_CART"])
  trigger: string;

  @IsIn(["NEW", "POTENTIAL", "LOYAL", "CHAMPION", "AT_RISK", "DORMANT"])
  @IsOptional()
  targetSegment?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  minHealthScore?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  rewardValue?: number;

  @IsIn(["FIXED", "PERCENT"])
  @IsOptional()
  rewardType?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsIn(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"])
  @IsOptional()
  status?: string;
}

export class UpdateCampaignDto extends CreateCampaignDto {}
