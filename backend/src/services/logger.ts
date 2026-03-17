/**
 * Structured Logger
 *
 * Provides pino-style structured JSON logging without the pino dependency.
 * In production, swap this for real pino: `import pino from 'pino';`
 *
 * Features:
 * - JSON-formatted log lines (machine-parseable)
 * - Log levels: trace, debug, info, warn, error, fatal
 * - Child loggers with bound context
 * - Request logging middleware
 * - Redaction of sensitive fields
 * - Timing helpers
 */

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60,
};

interface LogEntry {
  level: LogLevel;
  levelValue: number;
  time: string;
  msg: string;
  [key: string]: any;
}

interface LoggerOptions {
  level?: LogLevel;
  name?: string;
  redact?: string[];
  pretty?: boolean;
}

// ─── Sensitive Field Redaction ────────────────────────────────────────────────

const DEFAULT_REDACT_FIELDS = [
  'password', 'passwordHash', 'salt', 'token', 'apiKey', 'api_key',
  'secret', 'authorization', 'cookie', 'creditCard', 'ssn',
  'cardNumber', 'cvv', 'expiry',
];

function redactObject(obj: any, redactFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => redactObject(item, redactFields));

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (redactFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value, redactFields);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Logger Class ────────────────────────────────────────────────────────────

export class Logger {
  private level: LogLevel;
  private levelValue: number;
  private context: Record<string, any>;
  private redactFields: string[];
  private pretty: boolean;

  constructor(options: LoggerOptions = {}, context: Record<string, any> = {}) {
    this.level = options.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.levelValue = LEVEL_VALUES[this.level] || 30;
    this.context = { ...context };
    if (options.name) this.context.name = options.name;
    this.redactFields = options.redact || DEFAULT_REDACT_FIELDS;
    this.pretty = options.pretty ?? process.env.NODE_ENV !== 'production';
  }

  // ─── Child Logger ──────────────────────────────────────────────────────

  child(bindings: Record<string, any>): Logger {
    const child = new Logger(
      { level: this.level, redact: this.redactFields, pretty: this.pretty },
      { ...this.context, ...bindings },
    );
    return child;
  }

  // ─── Log Methods ───────────────────────────────────────────────────────

  trace(msg: string, data?: Record<string, any>) { this.log('trace', msg, data); }
  debug(msg: string, data?: Record<string, any>) { this.log('debug', msg, data); }
  info(msg: string, data?: Record<string, any>) { this.log('info', msg, data); }
  warn(msg: string, data?: Record<string, any>) { this.log('warn', msg, data); }
  error(msg: string, data?: Record<string, any>) { this.log('error', msg, data); }
  fatal(msg: string, data?: Record<string, any>) { this.log('fatal', msg, data); }

  private log(level: LogLevel, msg: string, data?: Record<string, any>): void {
    if (LEVEL_VALUES[level] < this.levelValue) return;

    const entry: LogEntry = {
      level,
      levelValue: LEVEL_VALUES[level],
      time: new Date().toISOString(),
      msg,
      ...this.context,
      ...(data ? redactObject(data, this.redactFields) : {}),
    };

    const line = JSON.stringify(entry);

    if (this.pretty) {
      const color = level === 'error' || level === 'fatal' ? '\x1b[31m'
        : level === 'warn' ? '\x1b[33m'
        : level === 'debug' || level === 'trace' ? '\x1b[90m'
        : '\x1b[36m';
      const reset = '\x1b[0m';
      const ts = entry.time.split('T')[1].replace('Z', '');
      console.log(`${color}[${ts}] ${level.toUpperCase().padEnd(5)}${reset} ${msg}`, data ? JSON.stringify(redactObject(data, this.redactFields)) : '');
    } else {
      // Production: single JSON line per log entry
      process.stdout.write(line + '\n');
    }
  }

  // ─── Timing Helpers ────────────────────────────────────────────────────

  time(label: string): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
      this.info(`${label} completed`, { durationMs: Math.round(elapsed * 100) / 100 });
      return elapsed;
    };
  }
}

// ─── Request Logger Middleware ────────────────────────────────────────────────

export function requestLogger(logger: Logger) {
  return (req: any, res: any, next: () => void) => {
    const start = process.hrtime.bigint();
    const reqLogger = logger.child({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    // Log request
    reqLogger.info('request started', {
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
    });

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
      reqLogger.info('request completed', {
        statusCode: res.statusCode,
        durationMs: Math.round(elapsed * 100) / 100,
      });
      return originalJson(body);
    };

    next();
  };
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _logger: Logger | null = null;

export function getLogger(): Logger {
  if (!_logger) {
    _logger = new Logger({ name: 'universalcart' });
  }
  return _logger;
}
