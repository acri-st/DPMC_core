import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{
      status: (n: number) => { json: (b: unknown) => void };
    }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const rawCode: string = HttpStatus[status] ?? 'Error';
      const code = rawCode
        .toLowerCase()
        .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
        .replace(/^[a-z]/, (c) => c.toUpperCase());
      res.status(status).json({
        error: { code, message: exception.message },
      });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';
    res.status(500).json({
      error: { code: 'InternalServerError', message },
    });
  }
}
