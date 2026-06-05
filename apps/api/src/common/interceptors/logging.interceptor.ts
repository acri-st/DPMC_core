import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url } = request;
    const body = request.body as Record<string, unknown> | undefined;
    const startTime = Date.now();

    const bodyString =
      body && Object.keys(body).length > 0 ? JSON.stringify(body) : '';

    this.logger.verbose(
      `→ ${method} ${url}${bodyString ? ` | Body: ${bodyString}` : ''}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.verbose(
            `← ${method} ${url} | ${response.statusCode} | ${duration}ms`,
          );
        },
        error: (error: HttpException | Error) => {
          const duration = Date.now() - startTime;
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.logger.verbose(
            `← ${method} ${url} | ${status} | ${duration}ms | ${error.message}`,
          );
        },
      }),
    );
  }
}
