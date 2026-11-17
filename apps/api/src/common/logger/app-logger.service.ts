import { ConsoleLogger, Injectable, type LogLevel } from '@nestjs/common';

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevels: LogLevel[] = isProduction
      ? ['error', 'warn', 'log', 'fatal']
      : ['error', 'warn', 'log', 'debug', 'verbose', 'fatal'];

    super({
      // JSON in production so Render and log tooling can parse records;
      // readable coloured text locally.
      json: isProduction,
      colors: !isProduction,
      logLevels,
      // In JSON mode, structured metadata is spread at the root.
      flattenParams: true,
      // Applies to structured params and non-string messages.
      redact: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'cookie',
        'secret',
        'BETTER_AUTH_SECRET',
      ],
    });
  }
}
