import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '@/core/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class CryptoService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const raw = this.config.get('SESSION_ENCRYPTION_KEY');
    const buf = Buffer.from(raw, 'base64');
    if (buf.byteLength !== 32) {
      throw new Error(
        `SESSION_ENCRYPTION_KEY must decode to 32 bytes, got ${buf.byteLength}`,
      );
    }
    this.key = buf;
  }

  encrypt(plaintext: string): Buffer {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
  }

  decrypt(buf: Buffer): string {
    if (buf.byteLength < IV_LENGTH + TAG_LENGTH) {
      throw new Error('CryptoService: ciphertext too short');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const enc = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
  }
}
