import { IsOptional, IsString, MaxLength } from "class-validator";

export class RejectQueueDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
