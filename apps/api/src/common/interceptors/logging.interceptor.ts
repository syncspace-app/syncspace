import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../logger/app-logger.service.js';
import { getOrCreateRequestId } from '../logger/request-id.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = getOrCreateRequestId(request, response);
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          'request.completed',
          {
            requestId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          },
          LoggingInterceptor.name,
        );
      }),
    );
  }
}
