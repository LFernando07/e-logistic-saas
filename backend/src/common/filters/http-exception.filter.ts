/**
 * @fileoverview HttpExceptionFilter
 * Filtro global de excepciones para estandarizar las respuestas de error HTTP de la API.
 * Captura excepciones controladas e imprevistas, formatea la respuesta en una estructura uniforme
 * con marca de tiempo, ruta, metodo y mensaje claro, y registra trazas de error en el log.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro de excepciones capturadas a nivel global.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Captura cualquier excepcion disparada en el ciclo de vida de la peticion HTTP
   * y responde con un cuerpo JSON normalizado.
   *
   * @param exception Excepcion o error arrojado
   * @param host Contexto de ejecucion de NestJS
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: typeof message === 'string' ? message : (message as any).message || message,
    };

    if (status >= 500) {
      this.logger.error(
        `HTTP Error: ${request.method} ${request.url} - Status: ${status} - Error: ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`Client Error: ${request.method} ${request.url} - Status: ${status}`);
    }

    response.status(status).json(errorResponse);
  }
}
