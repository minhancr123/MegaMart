import { Injectable } from '@nestjs/common';
import { PrismaService } from './prismaClient/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma : PrismaService) {}
  getHello(): any {
    return this.prisma.user.findMany();
  }
}
