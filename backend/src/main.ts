import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: true }),
    );

    app.enableCors({
      origin: '*', // Allow all origins for testing
      credentials: true,
    });

    // Global exception filter for production-safe error handling
    app.useGlobalFilters(new HttpExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Create directories if they don't exist
    const directories = ['resumes', 'screenshots', 'uploads/resumes'];
    for (const dir of directories) {
      const dirPath = join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    const port = process.env.BACKEND_PORT || 3000;
    await app.listen(port, '0.0.0.0');

    logger.log('='.repeat(60));
    logger.log('🚀 JOB APPLICATION ENGINE STARTED');
    logger.log('='.repeat(60));
    logger.log(`Server: http://localhost:${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log('='.repeat(60));
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
