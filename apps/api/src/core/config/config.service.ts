import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { z } from 'zod';

import { schema } from './config.schema';

export type ConfigVars = z.infer<typeof schema>;

@Injectable()
export class ConfigService {
  static readonly logger = new Logger(ConfigService.name);

  constructor(private readonly configService: NestConfigService) {}

  static validate = (config: Record<string, unknown>) => {
    const parsed = schema.safeParse(config);

    if (!parsed.success) {
      const errors = ConfigService.getErrors(parsed.error);

      for (const error of errors) {
        ConfigService.logger.error(
          `❌ ${error.key} received ${error.received} but expected ${error.expected}`,
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

    for (const issue of error.issues) {
      if (issue.code === 'invalid_type') {
        errors.push({
          key: issue.path.join('.'),
          message: issue.message,
          expected: issue.expected,
          received: issue.received,
        });

        continue;
      }

      errors.push({
        key: issue.path.join('.'),
        message: issue.message,
        expected: issue.code,
        received: ConfigService.formatReceivedValue(issue),
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

  getOptional<K extends keyof ConfigVars>(
    key: K,
  ): ConfigVars[K] | undefined {
    return this.configService.get<ConfigVars[K]>(key);
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }
}