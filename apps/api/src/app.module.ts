import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { LoggerModule } from './common/logger/logger.module.js';
import { validateEnv } from './config/env.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Tests set their own environment; never read a developer's .env.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      // Turbo and `yarn workspace` run with cwd = apps/api.
      envFilePath: ['../../.env'],
      validate: validateEnv,
    }),
    LoggerModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
