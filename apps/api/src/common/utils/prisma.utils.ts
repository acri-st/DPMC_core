export const isPrismaError = (err: unknown, code: string): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === code;

export const isUniqueViolation = (err: unknown): boolean =>
  isPrismaError(err, 'P2002');

export const isNotFoundError = (err: unknown): boolean =>
  isPrismaError(err, 'P2025');
