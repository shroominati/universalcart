/**
 * Startup Configuration Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if anything is missing or invalid.
 *
 * Usage: import { config } from './config'; (at top of index.ts)
 */

// ─── Environment Definitions ─────────────────────────────────────────────────

interface EnvVar {
  key: string;
  required: boolean;
  default?: string;
  validate?: (value: string) => boolean;
  description: string;
  sensitive?: boolean; // Don't log the value
}

const ENV_VARS: EnvVar[] = [
  // Server
  { key: 'PORT', required: false, default: '3001', validate: v => !isNaN(Number(v)) && Number(v) > 0 && Number(v) < 65536, description: 'Server port' },
  { key: 'NODE_ENV', required: false, default: 'development', validate: v => ['development', 'test', 'production'].includes(v), description: 'Node environment' },
  { key: 'HOST', required: false, default: '0.0.0.0', description: 'Server bind address' },

  // Security Secrets
  { key: 'UC_AUTH_SECRET', required: false, default: '', description: 'Auth service secret key (auto-generated if empty)', sensitive: true },
  { key: 'UC_SIGNING_SECRET', required: false, default: '', description: 'Request signing secret (auto-generated if empty)', sensitive: true },
  { key: 'UC_WS_SECRET', required: false, default: '', description: 'WebSocket encryption secret', sensitive: true },
  { key: 'UC_KEY_ROTATION_SECRET', required: false, default: '', description: 'API key rotation encryption key', sensitive: true },

  // External APIs (required in production)
  { key: 'ANTHROPIC_API_KEY', required: false, default: '', description: 'Anthropic API key for LLM features', sensitive: true },
  { key: 'SERP_API_KEY', required: false, default: '', description: 'SerpAPI key for price search', sensitive: true },

  // Database
  { key: 'DB_PATH', required: false, default: './data/universalcart.db', description: 'SQLite database file path' },

  // Rate Limiting
  { key: 'RATE_LIMIT_GLOBAL', required: false, default: '100', validate: v => !isNaN(Number(v)) && Number(v) > 0, description: 'Global rate limit per minute' },

  // CORS
  { key: 'CORS_ORIGIN', required: false, default: '*', description: 'CORS allowed origin' },
];

// ─── Validation Logic ────────────────────────────────────────────────────────

interface ConfigError {
  key: string;
  message: string;
}

interface ValidatedConfig {
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
  HOST: string;
  UC_AUTH_SECRET: string;
  UC_SIGNING_SECRET: string;
  UC_WS_SECRET: string;
  UC_KEY_ROTATION_SECRET: string;
  ANTHROPIC_API_KEY: string;
  SERP_API_KEY: string;
  DB_PATH: string;
  RATE_LIMIT_GLOBAL: number;
  CORS_ORIGIN: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export function validateConfig(): { config: ValidatedConfig; warnings: string[] } {
  const errors: ConfigError[] = [];
  const warnings: string[] = [];
  const resolved: Record<string, string> = {};

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.key];

    if (!value && envVar.required) {
      errors.push({ key: envVar.key, message: `${envVar.key} is required — ${envVar.description}` });
      continue;
    }

    const finalValue = value || envVar.default || '';
    resolved[envVar.key] = finalValue;

    // Run validator if provided
    if (finalValue && envVar.validate && !envVar.validate(finalValue)) {
      errors.push({ key: envVar.key, message: `${envVar.key} has invalid value — ${envVar.description}` });
    }

    // Warn about missing optional secrets in production
    if (!value && envVar.sensitive && process.env.NODE_ENV === 'production') {
      warnings.push(`${envVar.key} not set — using auto-generated key. Set explicitly in production.`);
    }
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.UC_AUTH_SECRET) {
      warnings.push('UC_AUTH_SECRET not set in production — sessions will not survive restarts');
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      warnings.push('ANTHROPIC_API_KEY not set — LLM features (price scout, promo discovery) will be disabled');
    }
    if (resolved.CORS_ORIGIN === '*') {
      warnings.push('CORS_ORIGIN is set to * in production — consider restricting to your extension origin');
    }
  }

  // Fail fast on errors
  if (errors.length > 0) {
    console.error('\n┌─────────────────────────────────────────────────────────┐');
    console.error('│  STARTUP FAILED — Configuration Errors                  │');
    console.error('├─────────────────────────────────────────────────────────┤');
    for (const err of errors) {
      console.error(`│  ✗ ${err.message.padEnd(55)}│`);
    }
    console.error('└─────────────────────────────────────────────────────────┘\n');
    process.exit(1);
  }

  const nodeEnv = (resolved.NODE_ENV || 'development') as 'development' | 'test' | 'production';

  const config: ValidatedConfig = {
    PORT: parseInt(resolved.PORT) || 3001,
    NODE_ENV: nodeEnv,
    HOST: resolved.HOST,
    UC_AUTH_SECRET: resolved.UC_AUTH_SECRET,
    UC_SIGNING_SECRET: resolved.UC_SIGNING_SECRET,
    UC_WS_SECRET: resolved.UC_WS_SECRET,
    UC_KEY_ROTATION_SECRET: resolved.UC_KEY_ROTATION_SECRET,
    ANTHROPIC_API_KEY: resolved.ANTHROPIC_API_KEY,
    SERP_API_KEY: resolved.SERP_API_KEY,
    DB_PATH: resolved.DB_PATH,
    RATE_LIMIT_GLOBAL: parseInt(resolved.RATE_LIMIT_GLOBAL) || 100,
    CORS_ORIGIN: resolved.CORS_ORIGIN,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
    isTest: nodeEnv === 'test',
  };

  return { config, warnings };
}

// ─── Print Config Summary ────────────────────────────────────────────────────

export function printConfigSummary(config: ValidatedConfig, warnings: string[]): void {
  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  UniversalCart Backend — Configuration                   │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│  Environment:  ${config.NODE_ENV.padEnd(41)}│`);
  console.log(`│  Port:         ${String(config.PORT).padEnd(41)}│`);
  console.log(`│  Host:         ${config.HOST.padEnd(41)}│`);
  console.log(`│  Database:     ${config.DB_PATH.padEnd(41)}│`);
  console.log(`│  CORS Origin:  ${config.CORS_ORIGIN.padEnd(41)}│`);
  console.log(`│  Rate Limit:   ${(config.RATE_LIMIT_GLOBAL + '/min').padEnd(41)}│`);
  console.log(`│  Auth Secret:  ${(config.UC_AUTH_SECRET ? '✓ set' : '○ auto').padEnd(41)}│`);
  console.log(`│  Anthropic:    ${(config.ANTHROPIC_API_KEY ? '✓ set' : '○ not set').padEnd(41)}│`);
  console.log(`│  SerpAPI:      ${(config.SERP_API_KEY ? '✓ set' : '○ not set').padEnd(41)}│`);

  if (warnings.length > 0) {
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│  Warnings:                                              │');
    for (const w of warnings) {
      // Wrap long warnings
      const lines = w.match(/.{1,53}/g) || [w];
      for (const line of lines) {
        console.log(`│  ⚠ ${line.padEnd(53)}│`);
      }
    }
  }

  console.log('└─────────────────────────────────────────────────────────┘\n');
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _config: ValidatedConfig | null = null;

export function getConfig(): ValidatedConfig {
  if (!_config) {
    const { config, warnings } = validateConfig();
    _config = config;
    if (!config.isTest) {
      printConfigSummary(config, warnings);
    }
  }
  return _config;
}

export { ValidatedConfig };
