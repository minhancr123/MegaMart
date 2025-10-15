"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const hash_util_1 = require("../../utils/hash.util");
let AuthService = class AuthService {
    userService;
    JwtService;
    constructor(userService, JwtService) {
        this.userService = userService;
        this.JwtService = JwtService;
    }
    async validateUser(email, password) {
        const user = await this.userService.findByEmail(email);
        if (!user)
            throw new Error('Người dùng không tồn tại');
        const isValid = await hash_util_1.HashUtil.compare(password, user.passwordHash);
        if (!isValid)
            throw new Error('Thông tin đăng nhập không hợp lệ');
        return user;
    }
    async signIn(user) {
        const { passwordHash, ...safeUser } = user;
        const payload = { email: safeUser.email, sub: safeUser.id };
        const accessToken = await this.JwtService.signAsync(payload);
        return { accessToken, user: safeUser };
    }
    async signUp(email, name, password) {
        const userExists = await this.userService.findByEmail(email);
        if (userExists) {
            return { status: 0, message: 'Người dùng đã tồn tại' };
        }
        const newUser = await this.userService.create({ email, name, password });
        return { status: 1, message: 'Đăng ký thành công', newUser };
    }
    create(createAuthDto) {
        return 'This action adds a new auth';
    }
    findAll() {
        return `This action returns all auth`;
    }
    findOne(id) {
        return `This action returns a #${id} auth`;
    }
    update(id, updateAuthDto) {
        return `This action updates a #${id} auth`;
    }
    remove(id) {
        return `This action removes a #${id} auth`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map