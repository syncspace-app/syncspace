import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service.js';
import { getOrCreateRequestId } from '../logger/request-id.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error(
        'exception.unhandled',
        { error: this.describe(exception, true) },
        AllExceptionsFilter.name,
      );
      return;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = getOrCreateRequestId(request, response);

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? this.extractMessage(exception)
        : 'Internal server error';

    const details = {
      event: 'request.failed',
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      error: this.describe(exception, statusCode >= 500),
    };

    if (statusCode >= 500) {
      this.logger.error('request.failed', details, AllExceptionsFilter.name);
    } else {
      this.logger.warn('request.failed', details, AllExceptionsFilter.name);
    }

    if (response.headersSent) {
      return;
    }

    response.status(statusCode).json({
      statusCode,
      message,
      requestId,
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private extractMessage(exception: HttpException): string | string[] {
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return body;
    }

    const message = (body as { message?: string | string[] }).message;

    return message ?? exception.message;
  }

  private describe(
    exception: unknown,
    includeStack: boolean,
  ): Record<string, unknown> {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        ...(includeStack ? { stack: exception.stack } : {}),
      };
    }

    return { message: String(exception) };
  }
}
