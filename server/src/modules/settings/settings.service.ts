import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prismaClient/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    // Get the first (and only) settings record, or create it if it doesn't exist
    let settings = await this.prisma.settings.findFirst();
    
    if (!settings) {
      settings = await this.prisma.settings.create({
        data: {}, // Will use default values from schema
      });
    }
    
    return settings;
  }

  async updateSettings(updateSettingsDto: UpdateSettingsDto) {
    // Get existing settings
    let settings = await this.getSettings();
    
    // Update settings
    const updated = await this.prisma.settings.update({
      where: { id: settings.id },
      data: updateSettingsDto,
    });
    
    return updated;
  }
}
