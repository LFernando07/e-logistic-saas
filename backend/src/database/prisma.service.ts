import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection initialized successfully.');
    } catch (error) {
      this.logger.warn(`Database connection deferred or unavailable during initialization: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed gracefully.');
  }
}
