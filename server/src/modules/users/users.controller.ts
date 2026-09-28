import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  UseGuards,
  ValidationPipe,
  Req,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AdminGuard } from "src/guards/admin.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { WalletService } from "../wallet/wallet.service";
import { LoyaltyService } from "../loyalty/loyalty.service";
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  QueryUserDto,
} from "./dto/user.dto";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary:
      "Create a new user (ADMIN only, đăng ký thường đi qua /auth/signup)",
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "User created successfully",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "User with this email already exists",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid input data",
  })
  create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get all users (lọc theo vai trò nếu truyền role)" })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["USER", "ADMIN", "SUPPLIER", "SHIPPER"],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of all users",
    type: [UserResponseDto],
  })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get(":id/customer-360")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get customer 360 view (CRM)" })
  getCustomer360(@Param("id") id: string) {
    return this.usersService.getCustomer360(id);
  }

  @Post(":id/adjust-wallet")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Admin cộng/trừ tiền ví khách hàng" })
  adjustWallet(@Param("id") id: string, @Body() body: any) {
    const { amount, reason } = body;
    return this.walletService.credit(
      id,
      amount,
      undefined,
      "ADJUSTMENT",
      reason,
    );
  }

  @Post(":id/adjust-points")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Admin tặng/điều chỉnh điểm loyalty" })
  adjustPoints(@Param("id") id: string, @Body() body: any) {
    const { amount, reason, type } = body;
    return this.loyaltyService.adminAdjustPoints(
      id,
      amount,
      reason,
      type || "BONUS",
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({
    name: "id",
    description: "User ID",
    example: "cuid_example_123",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User found",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  //Update user by ID
  @Patch(":id")
  @ApiOperation({ summary: "Update user by ID" })
  @ApiParam({
    name: "id",
    description: "User ID",
    example: "cuid_example_123",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User updated successfully",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Email already in use",
  })
  // @ApiBearerAuth('JWT-auth') // Uncomment when authentication is implemented
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }
  @ApiParam({
    name: "id",
    description: "User ID",
    example: "cuid_example_123",
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User updated successfully",
    type: UserResponseDto,
  })

  //Update avatar for the authenticated user
  @Patch("me/avatar/:id")
  @ApiOperation({ summary: "Upload avatar for the authenticated user" })
  @ApiParam({
    name: "avatarUrl",
    description: "Update avatar URL",
    example: "string123",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Avatar updated successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  updateAvatar(@Param("id") id: string, @Body("avatarUrl") avatarUrl: string) {
    return this.usersService.updateAvatar(id, avatarUrl);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete user by ID" })
  @ApiParam({
    name: "id",
    description: "User ID",
    example: "cuid_example_123",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User deleted successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "User not found",
  })
  // @ApiBearerAuth('JWT-auth') // Uncomment when authentication is implemented
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param("id") id: string, @Req() req: any) {
    if (req.user?.userId === id) {
      throw new HttpException(
        { success: false, message: "Không thể xóa chính tài khoản của mình" },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.usersService.remove(id);
  }
}
