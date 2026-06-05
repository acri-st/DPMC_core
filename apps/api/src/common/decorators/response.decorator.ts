import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiMovedPermanentlyResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ZodSchema } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { HttpCode } from '@dpmc/client';

const createErrorPayloadContent = (status: number) => {
  return {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: { type: 'number', enum: [status] },
          success: { type: 'string', enum: ['OK', 'KO'] },
          message: { type: 'string' },
        },
      },
    },
  };
};

// 400
function BadRequestResponse() {
  return applyDecorators(
    ApiBadRequestResponse({
      description:
        'The request is invalid. Please check the request body and try again.',
      content: createErrorPayloadContent(HttpCode.BAD_REQUEST),
    }),
  );
}

// 401
function UnauthorizedResponse() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description:
        'You must be authenticated to access this resource. Please check your credentials and try again.',
      content: createErrorPayloadContent(HttpCode.UNAUTHORIZED),
    }),
  );
}

// 403
function ForbiddenResponse() {
  return applyDecorators(
    ApiForbiddenResponse({
      description: 'You are not authorized to access this resource.',
      content: createErrorPayloadContent(HttpCode.FORBIDDEN),
    }),
  );
}

// 404
function NotFoundResponse() {
  return applyDecorators(
    ApiNotFoundResponse({
      description: 'The requested resource was not found on the server.',
      content: createErrorPayloadContent(HttpCode.NOT_FOUND),
    }),
  );
}

// 409
function ConflictResponse() {
  return applyDecorators(
    ApiConflictResponse({
      description:
        'The request conflicts with an existing resource on the server.',
      content: createErrorPayloadContent(HttpCode.CONFLICT),
    }),
  );
}

// 429
function TooManyRequestsResponse() {
  return applyDecorators(
    ApiTooManyRequestsResponse({
      description: 'Too many requests. Please try again later.',
      content: createErrorPayloadContent(HttpCode.TOO_MANY_REQUESTS),
    }),
  );
}

// 500
function InternalResponse() {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      description:
        'An internal server error occurred. Please contact developers.',
      content: createErrorPayloadContent(HttpCode.INTERNAL_SERVER_ERROR),
    }),
  );
}

// 200
export function SuccessResponse(
  zodSchema: ZodSchema,
  description = 'Successfull response',
) {
  const schema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
  }) as Record<string, unknown>;
  return applyDecorators(
    BadRequestResponse(),
    UnauthorizedResponse(),
    ForbiddenResponse(),
    NotFoundResponse(),
    ConflictResponse(),
    TooManyRequestsResponse(),
    InternalResponse(),
    ApiOkResponse({
      description,
      content: {
        'application/json': {
          schema,
        },
      },
    }),
  );
}

// 201
export function CreatedResponse(
  zodSchema: ZodSchema,
  description = 'Resource created successfully',
) {
  const schema = zodToJsonSchema(zodSchema, {
    target: 'openApi3',
  }) as Record<string, unknown>;
  return applyDecorators(
    BadRequestResponse(),
    UnauthorizedResponse(),
    ForbiddenResponse(),
    NotFoundResponse(),
    ConflictResponse(),
    TooManyRequestsResponse(),
    InternalResponse(),
    ApiCreatedResponse({
      description,
      content: {
        'application/json': {
          schema,
        },
      },
    }),
  );
}

// 204
export function NoContentResponse(
  description = 'Resource deleted successfully',
) {
  return applyDecorators(
    BadRequestResponse(),
    UnauthorizedResponse(),
    ForbiddenResponse(),
    NotFoundResponse(),
    ConflictResponse(),
    TooManyRequestsResponse(),
    InternalResponse(),
    ApiNoContentResponse({
      description,
    }),
  );
}

// 302
export function RedirectResponse(
  description = 'Redirecting to the specified URL',
) {
  return applyDecorators(
    BadRequestResponse(),
    UnauthorizedResponse(),
    ForbiddenResponse(),
    NotFoundResponse(),
    ConflictResponse(),
    TooManyRequestsResponse(),
    InternalResponse(),
    ApiMovedPermanentlyResponse({
      description,
    }),
  );
}
