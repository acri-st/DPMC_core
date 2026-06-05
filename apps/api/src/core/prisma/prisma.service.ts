import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@dpmc/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '../config/config.service';
import { ApiService } from '@dpmc/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get('DATABASE_URL');
    super({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.debug('Connected to database');
    } catch (error) {
      this.logger.error('Error connecting to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.debug('Disconnected from database');
  }

  async getStatus() {
    const result: ApiService = {
      name: 'Prisma',
      status: 'OK',
    };

    try {
      await this.$queryRaw`SELECT 1`;
      result.status = 'OK';
    } catch {
      result.status = 'KO';
    }

    return result;
  }
}
