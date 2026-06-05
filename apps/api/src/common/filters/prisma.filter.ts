import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaErrors } from '@/core';
import { Prisma } from '@dpmc/prisma';

type PrismaKnownError = Prisma.PrismaClientKnownRequestError;

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaKnownError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const httpException = this.mapPrismaError(exception);
    const statusCode = httpException.getStatus();

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        message: httpException.message,
      },
    });
  }

  private mapPrismaError(exception: PrismaKnownError): HttpException {
    const errorCode = exception.code as PrismaErrors;

    switch (errorCode) {
      case PrismaErrors.UniqueConstraintViolation:
        return new ConflictException(
          this.getUniqueConstraintMessage(exception),
        );
      case PrismaErrors.ForeignKeyViolation:
        return new NotFoundException(this.getForeignKeyMessage(exception));
      case PrismaErrors.RecordNotFound:
        return new NotFoundException('Record not found');
      case PrismaErrors.ValidationError:
        return new BadRequestException('Validation error');
      default:
        return new InternalServerErrorException('Internal server error');
    }
  }

  private getUniqueConstraintMessage(exception: PrismaKnownError): string {
    const target = this.getMetaValue(exception, 'target');

    if (this.isStringArray(target) && target.length > 0) {
      return `${target.join(', ')} already exists`;
    }

    return 'Unique constraint violation';
  }

  private getForeignKeyMessage(exception: PrismaKnownError): string {
    const fieldName = this.getMetaValue(exception, 'field_name');

    if (typeof fieldName === 'string' && fieldName.length > 0) {
      return `Related ${fieldName} not found`;
    }

    return 'Related record not found';
  }

  private getMetaValue(exception: PrismaKnownError, key: string): unknown {
    const meta = exception.meta;
    return meta?.[key];
  }

  private isStringArray(value: unknown): value is string[] {
    return (
      Array.isArray(value) && value.every((item) => typeof item === 'string')
    );
  }
}
