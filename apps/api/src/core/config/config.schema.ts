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
  COOKIE_MAX_AGE: z.coerce.number().transform((value) => value * 1000),

  WORKER_REGISTRATION_TOKEN: z.string().min(20),
  WORKER_OFFLINE_THRESHOLD_S: z.coerce.number().int().positive().default(60),

  SCHEDULER_STALE_THRESHOLD_S: z.coerce.number().int().positive().default(45),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),

  S3_FORCE_PATH_STYLE: z
    .union([z.string(), z.boolean()])
    .default(true)
    .transform((value) =>
      typeof value === 'string' ? value === 'true' : value,
    ),

  WARHOL_DATA_ROOT: z.string().default(''),

  SCRIPT_API_URL: z
    .string()
    .url()
    .default('http://host.docker.internal:3000/api'),

  SCRIPT_S3_ENDPOINT: z
    .string()
    .url()
    .default('http://host.docker.internal:9000'),

  IPF_PROCESSING_STATION: z.string().default('DPMC'),

  DPMC_STATIC_VOLUMES: z.string().default(''),

  // Absent on any deployment without the monitoring stack; the energy
  // reconciler then reports CPU only. Read with getOptional, never get.
  PROMETHEUS_URL: z.string().url().optional(),

  // Fallback when Host.tdpW is unset. Transfer intensity is deliberately
  // absent: it is per-site, on DataCenter.energyIntensity.
  ENERGY_W_PER_CORE: z.coerce.number().positive().default(15),

  // Wait for the final cAdvisor scrape to land before reading counters.
  ENERGY_RECONCILE_DELAY_S: z.coerce.number().positive().default(90),

  // Past this age, measure with whatever is available; no eternal backlog.
  ENERGY_RECONCILE_MAX_AGE_S: z.coerce.number().positive().default(86_400),

  ENERGY_RECONCILE_BATCH_SIZE: z.coerce.number().int().positive().default(50),
});
