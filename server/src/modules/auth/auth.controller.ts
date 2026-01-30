import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import type { Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private userService: UsersService) {}

  @Post()
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @UseGuards(LocalAuthGuard)
  @Post('signin')
  @ApiOperation({ summary: 'Signin an existing user' })
  @ApiBody({schema : {type : 'object', properties : {email : {type : 'string'}, password : {type : 'string'}}}})
  async signIn(@Request() req, @Res({passthrough : true}) res : Response) {
    // User đã được validate trong LocalStrategy và được gán vào req.user
    try {
      console.log("req.body: ", req.body);
      const { accessToken, user } = await this.authService.signIn(req.user);
      res.cookie('token', accessToken, { httpOnly: true, path: '/' , maxAge : 7 * 24 * 60 * 60 });
      return { 
        success: true, 
        accessToken, 
        user,
        message: 'Đăng nhập thành công' 
      };
    } catch (error) {
      throw new HttpException(
        { success: false, message: error.message || 'Đăng nhập thất bại' },
        HttpStatus.UNAUTHORIZED
      );
    }
  }
  @Post('signup')
  @ApiOperation({ summary: 'Signup a new user' })
  @ApiBody({type : CreateUserDto})
  async signUp(@Body() signUpDto: CreateUserDto) {
    try {
      const result = await this.authService.signUp(signUpDto.email, signUpDto.name || "Anonymous", signUpDto.password);
      
      if (result.status === 0) {
        throw new HttpException(
          { success: false, message: result.message },
          HttpStatus.CONFLICT
        );
      }
      
      return {
        success: true,
        message: result.message, 
        user: result.newUser 
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { success: false, message: error.message || 'Đăng ký thất bại' },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile (JWT protected)' })
  async getProfile(@Request() req) {
    const result = await this.authService.getProfile(req.user.id);
    return {
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      user: result
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
