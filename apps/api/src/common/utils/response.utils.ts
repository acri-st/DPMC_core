import { HttpCode } from '@dpmc/client';
import { ApiResponse } from '@dpmc/client';

export type ResponseOptions = {
  message?: string;
  status?: HttpCode;
  cursor?: string | null;
  next?: string | null;
  total?: number | null;
};

export type SuccessResponsePayload<T> = Omit<ApiResponse, 'data'> & {
  success: 'OK';
  data: T;
};

export const Response = {
  success<T>(data: T, opts: ResponseOptions = {}): SuccessResponsePayload<T> {
    const { status, message, cursor, next, total } = opts;
    return {
      success: 'OK' as const,
      status: status ?? HttpCode.OK,
      message: message ?? 'Request successful',
      cursor: Array.isArray(data) ? cursor : undefined,
      next: next ?? undefined,
      count: Array.isArray(data) ? data.length : undefined,
      total: total ?? undefined,
      data,
    };
  },
  error(opts: ResponseOptions = {}): ApiResponse {
    const { status, message } = opts;
    return {
      success: 'KO' as const,
      status: status ?? HttpCode.INTERNAL_SERVER_ERROR,
      message: message ?? 'An error occurred',
      ...opts,
    };
  },
};
