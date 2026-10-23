/**
 * @fileoverview PrismaService
 * Capa de abstraccion sobre el cliente ORM de Prisma.
 * Extiende PrismaClient implementando los ciclos de vida OnModuleInit y OnModuleDestroy de NestJS
 * para inicializar y desconectar conexiones de base de datos de forma limpia y controlada.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio global inyectable de acceso a la base de datos PostgreSQL.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Conecta el cliente de Prisma a la base de datos al inicializarse el modulo NestJS.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection initialized successfully.');
    } catch (error) {
      this.logger.warn(`Database connection deferred or unavailable during initialization: ${(error as Error).message}`);
    }
  }

  /**
   * Cierra ordenadamente el grupo de conexiones a la base de datos al apagarse la aplicacion.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed gracefully.');
  }
}
