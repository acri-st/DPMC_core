import { z } from 'zod';

export const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  API_PROTOCOL: z.enum(['http', 'https']),
  API_HOST: z.string(),
  API_PORT: z.coerce.number(),
  API_PREFIX: z.string(),
  API_URL: z.string(),

  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string(),
  KEYCLOAK_CLIENT_ID: z.string(),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),

  FRONTEND_URL: z.string().url(),

  SESSION_ENCRYPTION_KEY: z.string().min(40),
  SESSION_COOKIE_NAME: z.string().default('dpmc.sid'),
  OAUTH_COOKIE_NAME: z.string().default('dpmc.oauth'),

  DATABASE_URL: z.string().url(),

  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_MAX_AGE: z.coerce.number().transform((val) => val * 1000),

  WORKER_REGISTRATION_TOKEN: z.string().min(20),
  WORKER_OFFLINE_THRESHOLD_S: z.coerce.number().int().positive().default(60),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_FORCE_PATH_STYLE: z
    .union([z.string(), z.boolean()])
    .default(true)
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),

  // Root of the repository on the Docker HOST (not inside any container).
  // Used to build bind-mount source paths for job scripts and workdirs.
  // Defaults to two levels up from the API app directory (apps/api → repo root).
  WARHOL_DATA_ROOT: z.string().default(''),

  // URLs injected into script containers so they can reach the API + S3
  // themselves. Must use a hostname resolvable inside Docker (typically
  // host.docker.internal in dev, or a compose service name in prod).
  SCRIPT_API_URL: z
    .string()
    .url()
    .default('http://host.docker.internal:3000/api'),
  SCRIPT_S3_ENDPOINT: z
    .string()
    .url()
    .default('http://host.docker.internal:9000'),
});
