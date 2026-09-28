import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateAgentJobDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  batchSize?: number;
}
