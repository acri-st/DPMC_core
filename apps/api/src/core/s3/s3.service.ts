import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';

import { ConfigService } from '@/core/config';

const DEFAULT_TTL_S = 900; // 15 min — enough for one UI session

/**
 * Centralized S3 client + helpers around presigned URLs.
 *
 * Why presigned (not public bucket): with a presigned `GetObject` URL the
 * bucket can stay private and any S3-compatible backend works the same
 * (AWS, R2, GCS interop, MinIO). Each URL is short-lived and bound to a
 * single object key, so leaking one doesn't compromise the bucket.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get('S3_BUCKET');
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY'),
        secretAccessKey: config.get('S3_SECRET_KEY'),
      },
      forcePathStyle: Boolean(config.get('S3_FORCE_PATH_STYLE')),
    });
  }

  /**
   * Parse `s3://bucket/key` into `(bucket, key)`. Returns null on malformed
   * input rather than throwing — callers usually want to skip rather than
   * blow up on a missing/empty url field.
   */
  static parseS3Url(
    url: string | null | undefined,
  ): { bucket: string; key: string } | null {
    if (!url) return null;
    if (!url.startsWith('s3://')) return null;
    const rest = url.slice('s3://'.length);
    const slash = rest.indexOf('/');
    if (slash < 0) return null;
    const bucket = rest.slice(0, slash);
    const key = rest.slice(slash + 1);
    if (!bucket || !key) return null;
    return { bucket, key };
  }

  /**
   * Download an object and parse it as JSON.
   * `key` is the bare S3 key (no `s3://bucket/` prefix).
   */
  async getObjectAsJson(key: string): Promise<unknown> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const resp = await this.client.send(cmd);
    const stream = resp.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array),
      );
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  }

  /**
   * Sign a `GetObject` request and return an HTTPS URL the browser can
   * fetch directly. Returns null when the input isn't a valid S3 URL.
   */
  async presignGet(
    url: string | null | undefined,
    ttlSeconds = DEFAULT_TTL_S,
  ): Promise<string | null> {
    const parsed = S3Service.parseS3Url(url);
    if (!parsed) return null;
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key }),
        { expiresIn: ttlSeconds },
      );
    } catch (err) {
      this.logger.warn(
        `presignGet failed for ${url}: ${(err as Error).message}`,
      );
      return null;
    }
  }
}
