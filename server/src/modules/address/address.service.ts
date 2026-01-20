import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all addresses by user
  async getAddressesByUser(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // Get address by ID
  async getAddressById(id: string, userId?: string) {
    const address = await this.prisma.address.findUnique({
      where: { id }
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    // Check ownership if userId provided
    if (userId && address.userId !== userId) {
      throw new HttpException(
        { success: false, message: 'Bạn không có quyền truy cập địa chỉ này' },
        HttpStatus.FORBIDDEN
      );
    }

    return address;
  }

  // Create new address
  async createAddress(createAddressDto: CreateAddressDto) {
    const { userId, isDefault, ...addressData } = createAddressDto;
    console.log("Address Data :" + createAddressDto.userId);
    // If this is default address, unset other defaults
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // If user has no addresses, make this default
    const existingCount = await this.prisma.address.count({
      where: { userId }
    });

    return this.prisma.address.create({
      data: {
        ...addressData,
        userId,
        isDefault: isDefault || existingCount === 0
      }
    });
  }

  // Update address
  async updateAddress(id: string, updateAddressDto: UpdateAddressDto, userId?: string) {
    const address = await this.getAddressById(id, userId);

    const { isDefault, ...addressData } = updateAddressDto;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId: address.userId, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    return this.prisma.address.update({
      where: { id },
      data: {
        ...addressData,
        ...(isDefault !== undefined && { isDefault })
      }
    });
  }

  // Set address as default
  async setDefaultAddress(id: string, userId: string) {
    const address = await this.getAddressById(id, userId);

    // Unset other defaults
    await this.prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: id } },
      data: { isDefault: false }
    });

    return this.prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });
  }

  // Delete address
  async deleteAddress(id: string, userId?: string) {
    const address = await this.getAddressById(id, userId);

    // If deleting default address, set another one as default
    if (address.isDefault) {
      const anotherAddress = await this.prisma.address.findFirst({
        where: { userId: address.userId, id: { not: id } },
        orderBy: { createdAt: 'desc' }
      });

      if (anotherAddress) {
        await this.prisma.address.update({
          where: { id: anotherAddress.id },
          data: { isDefault: true }
        });
      }
    }

    await this.prisma.address.delete({
      where: { id }
    });

    return { success: true, message: 'Xóa địa chỉ thành công' };
  }

  // Get default address
  async getDefaultAddress(userId: string) {
    return this.prisma.address.findFirst({
      where: { userId, isDefault: true }
    });
  }
}
