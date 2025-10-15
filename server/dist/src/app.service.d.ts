import { PrismaService } from './prismaClient/prisma.service';
export declare class AppService {
    private prisma;
    constructor(prisma: PrismaService);
    getHello(): any;
}
