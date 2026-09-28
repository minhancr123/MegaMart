import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  IsInt,
  IsNumber,
} from "class-validator";

export class CreateAddressDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  userId: string;

  @ApiProperty({ description: "Tên người nhận" })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ description: "Số điện thoại" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "Địa chỉ chi tiết" })
  @IsString()
  @MinLength(5)
  address: string;

  @ApiProperty({ description: "Tỉnh/Thành phố", required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ description: "Quận/Huyện", required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: "Phường/Xã", required: false })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({ description: "Vĩ độ địa chỉ Google Maps", required: false })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiProperty({ description: "Kinh độ địa chỉ Google Maps", required: false })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ description: "Mã tỉnh GHN (ProvinceID)", required: false })
  @IsOptional()
  @IsInt()
  provinceId?: number;

  @ApiProperty({
    description: "Mã quận/huyện GHN (DistrictID)",
    required: false,
  })
  @IsOptional()
  @IsInt()
  districtId?: number;

  @ApiProperty({ description: "Mã phường/xã GHN (WardCode)", required: false })
  @IsOptional()
  @IsString()
  wardCode?: string;

  @ApiProperty({
    description: "Nhãn địa chỉ (Nhà, Văn phòng, ...)",
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: "Địa chỉ mặc định", default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
