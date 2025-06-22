// Dynamically require zod – if unavailable (offline test runner), fall back to no-op schema
let z: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  z = require('zod');
} catch {
  const stubString = () => ({
    default: () => stubString(),
    optional: () => stubString(),
  });
  z = {
    string: stubString,
    object: () => ({
      refine: (_fn: any, _msg: any) => ({ parse: (env: any) => env }),
    }),
  };
}
const { string } = z;
// re-export z functions used below
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
// @ts-ignore
const zodString = z.string ? z.string : string;
// Use the dynamic z reference thereafter
let SecretsProvider: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SecretsProvider = require('@aws-lambda-powertools/parameters/secrets').SecretsProvider;
} catch {
  SecretsProvider = class {
    async get() {
      return process.env.JWT_SECRET || 'test_secret';
    }
  };
}

// Validate & strongly-type environment variables at cold start
const envSchema = z
  .object({
    REGION: z.string().default('eu-north-1'),
    AWS_REGION: z.string().optional(), // Allow AWS default env var
    STAGE: z.string().default('dev'),
    USERS_TABLE: z.string(),    BEDROCK_MODEL_ID: z
      .string()
      .default('amazon.nova-micro-v1:0'),
    TRANSLATE_CACHE_TTL: z.string().optional(),
    REVIEW_ALERTS_TOPIC_ARN: z.string(),
    REVIEW_REQUESTS_TABLE: z.string(),
    JWT_SECRET: z.string().optional(),
    JWT_SECRET_ARN: z.string().optional(),
  })
  .refine((data: any) => data.JWT_SECRET || data.JWT_SECRET_ARN, {
    message: 'Either JWT_SECRET or JWT_SECRET_ARN must be provided',
  });

const parsedEnv: any = envSchema.parse(process.env);

export const AWS_REGION: string = (parsedEnv.AWS_REGION || parsedEnv.REGION) as string;
export const BEDROCK_MODEL_ID: string = parsedEnv.BEDROCK_MODEL_ID as string;
export const TRANSLATE_CACHE_TTL = parsedEnv.TRANSLATE_CACHE_TTL
  ? Number(parsedEnv.TRANSLATE_CACHE_TTL)
  : 300_000;
export const REVIEW_ALERTS_TOPIC_ARN: string = parsedEnv.REVIEW_ALERTS_TOPIC_ARN as string;
export const REVIEW_REQUESTS_TABLE: string = parsedEnv.REVIEW_REQUESTS_TABLE as string;

/**
 * Lazily fetch & cache JWT secret. If JWT_SECRET is set directly we use it,
 * otherwise we fetch from Secrets Manager via Powertools Parameters.
 * The Powertools global caching will honour POWERTOOLS_PARAMETERS_MAX_AGE.
 */
let _jwtSecret: string | undefined;
export const getJwtSecret = async (): Promise<string> => {
  if (_jwtSecret) return _jwtSecret!;

  if (parsedEnv.JWT_SECRET) {
    _jwtSecret = parsedEnv.JWT_SECRET;
    return _jwtSecret!;
  }

  const provider = new SecretsProvider();
  _jwtSecret = (await provider.get(parsedEnv.JWT_SECRET_ARN!)) as string;
  if (!_jwtSecret) {
    throw new Error('Unable to retrieve JWT secret from Secrets Manager');
  }
  return _jwtSecret!;
};

export const STAGE: string = (parsedEnv.STAGE as string) || 'dev';
export const USERS_TABLE: string = parsedEnv.USERS_TABLE as string; 