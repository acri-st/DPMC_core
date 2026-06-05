import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { z } from 'zod';
import { schema } from './config.schema';

export type ConfigVars = z.infer<typeof schema>;

@Injectable()
export class ConfigService {
  static readonly logger = new Logger(ConfigService.name);

  constructor(private configService: NestConfigService) {}

  static validate = (config: Record<string, unknown>) => {
    const parsed = schema.safeParse(config);

    if (!parsed.success) {
      const errors = ConfigService.getErrors(parsed.error);
      for (const e of errors) {
        ConfigService.logger.error(
          `❌ ${e.key} received ${e.received} but expected ${e.expected}`,
        );
      }
      process.exit(1);
    }

    return parsed.data;
  };

  static getErrors(error: z.ZodError) {
    const errors: {
      key: string;
      message: string;
      expected: string;
      received: string;
    }[] = [];

    for (const e of error.issues) {
      if (e.code === 'invalid_type') {
        errors.push({
          key: e.path.join('.'),
          message: e.message,
          expected: e.expected,
          received: e.received,
        });
        continue;
      }

      errors.push({
        key: e.path.join('.'),
        message: e.message,
        expected: e.code,
        received: ConfigService.formatReceivedValue(e),
      });
    }

    return errors;
  }

  private static formatReceivedValue(issue: z.ZodIssue): string {
    if ('received' in issue) {
      return String(issue.received);
    }
    if (issue.path.length === 0) {
      return 'root';
    }
    return 'provided';
  }

  get<K extends keyof ConfigVars>(key: K): ConfigVars[K] {
    const value = this.configService.get<ConfigVars[K]>(key);
    if (value === undefined) {
      ConfigService.logger.error(`Config error: ${String(key)} is not defined`);
      process.exit(1);
    }
    return value;
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}
