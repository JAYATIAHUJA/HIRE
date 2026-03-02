import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

/**
 * Configuration validation and management service
 */
@Injectable()
export class ConfigService implements OnModuleInit {
  // Database
  readonly DATABASE_URL: string;

  // LLM Provider
  readonly LLM_PROVIDER: 'gemini' | 'openai';
  readonly GEMINI_API_KEY?: string;
  readonly OPENAI_API_KEY?: string;

  // Skyvern
  readonly SKYVERN_MODE: 'local' | 'cloud';
  readonly SKYVERN_BASE_URL: string;
  readonly SKYVERN_API_KEY: string;
  readonly SKYVERN_ENABLED: boolean;
  readonly SKYVERN_MAX_RETRIES: number;

  // Application
  readonly PORT: number;
  readonly NODE_ENV: string;
  readonly LOG_LEVEL: string;

  // Embedding
  readonly EMBEDDING_MODEL: string;
  readonly EMBEDDING_DIMENSION: number;

  // Platform Credentials (optional)
  readonly LINKEDIN_EMAIL?: string;
  readonly LINKEDIN_PASSWORD?: string;
  readonly INTERNSHALA_EMAIL?: string;
  readonly INTERNSHALA_PASSWORD?: string;

  constructor(@InjectPinoLogger(ConfigService.name) private readonly logger: PinoLogger) {
    logger.setContext(ConfigService.name);
    // Load and validate configuration
    this.DATABASE_URL = this.getEnv('DATABASE_URL', true);
    
    this.LLM_PROVIDER = this.getEnv('LLM_PROVIDER', false, 'gemini') as 'gemini' | 'openai';
    this.GEMINI_API_KEY = this.getEnv('GEMINI_API_KEY', false);
    this.OPENAI_API_KEY = this.getEnv('OPENAI_API_KEY', false);

    this.SKYVERN_MODE = this.getEnv('SKYVERN_MODE', false, 'local') as 'local' | 'cloud';
    this.SKYVERN_BASE_URL = this.getEnv('SKYVERN_BASE_URL', true);
    this.SKYVERN_API_KEY = this.getEnv('SKYVERN_API_KEY', false, '');
    this.SKYVERN_ENABLED = this.getEnv('SKYVERN_ENABLED', false, 'true') !== 'false';
    this.SKYVERN_MAX_RETRIES = parseInt(this.getEnv('SKYVERN_MAX_RETRIES', false, '3'));

    this.PORT = parseInt(this.getEnv('BACKEND_PORT', false, '3000'));
    this.NODE_ENV = this.getEnv('NODE_ENV', false, 'development');
    this.LOG_LEVEL = this.getEnv('LOG_LEVEL', false, 'info');

    this.EMBEDDING_MODEL = this.getEnv('EMBEDDING_MODEL', false, 'text-embedding-3-small');
    this.EMBEDDING_DIMENSION = parseInt(this.getEnv('EMBEDDING_DIMENSION', false, '1536'));

    this.LINKEDIN_EMAIL = this.getEnv('LINKEDIN_EMAIL', false);
    this.LINKEDIN_PASSWORD = this.getEnv('LINKEDIN_PASSWORD', false);
    this.INTERNSHALA_EMAIL = this.getEnv('INTERNSHALA_EMAIL', false);
    this.INTERNSHALA_PASSWORD = this.getEnv('INTERNSHALA_PASSWORD', false);
  }

  async onModuleInit() {
    // Validate configuration on startup
    this.validateConfig();
    await this.healthChecks();
  }

  /**
   * Get environment variable with validation
   */
  private getEnv(key: string, required: boolean, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;

    if (required && !value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    return value || '';
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const errors: string[] = [];

    // Validate LLM provider
    if (!['gemini', 'openai'].includes(this.LLM_PROVIDER)) {
      errors.push(`Invalid LLM_PROVIDER: ${this.LLM_PROVIDER} (must be 'gemini' or 'openai')`);
    }

    // Check LLM API key based on provider
    if (this.LLM_PROVIDER === 'gemini' && !this.GEMINI_API_KEY) {
      errors.push('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
    }

    if (this.LLM_PROVIDER === 'openai' && !this.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }

    // Validate Skyvern mode
    if (!['local', 'cloud'].includes(this.SKYVERN_MODE)) {
      errors.push(`Invalid SKYVERN_MODE: ${this.SKYVERN_MODE} (must be 'local' or 'cloud')`);
    }

    // Cloud mode requires API key
    if (this.SKYVERN_MODE === 'cloud' && !this.SKYVERN_API_KEY) {
      errors.push('SKYVERN_API_KEY is required when SKYVERN_MODE=cloud');
    }

    // Validate database URL format
    if (!this.DATABASE_URL.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must start with postgresql://');
    }

    // Validate port
    if (isNaN(this.PORT) || this.PORT < 1 || this.PORT > 65535) {
      errors.push(`Invalid PORT: ${this.PORT} (must be 1-65535)`);
    }

    if (errors.length > 0) {
      this.logger.error('Configuration validation failed:');
      errors.forEach((error) => this.logger.error(`  - ${error}`));
      throw new Error('Invalid configuration');
    }

    this.logger.info('✓ Configuration validated successfully');
  }

  /**
   * Perform health checks on external services
   */
  private async healthChecks(): Promise<void> {
    this.logger.info('Performing startup health checks...');

    // Check Skyvern connectivity (if enabled)
    if (this.SKYVERN_ENABLED) {
      try {
        const response = await fetch(`${this.SKYVERN_BASE_URL}/health`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          this.logger.info(`✓ Skyvern service is reachable at ${this.SKYVERN_BASE_URL}`);
        } else {
          this.logger.warn(
            `⚠ Skyvern service returned non-OK status: ${response.status}`,
          );
        }
      } catch (error: any) {
        this.logger.warn(
          `⚠ Cannot reach Skyvern service at ${this.SKYVERN_BASE_URL}: ${error.message}`,
        );
        this.logger.warn('  Applications may fail if Skyvern is required');
      }
    } else {
      this.logger.info('ℹ Skyvern is disabled (SKYVERN_ENABLED=false)');
    }

    // Log configuration summary
    this.logConfigSummary();
  }

  /**
   * Log configuration summary (without sensitive data)
   */
  private logConfigSummary(): void {
    this.logger.info('Configuration Summary:');
    this.logger.info(`  Environment: ${this.NODE_ENV}`);
    this.logger.info(`  Port: ${this.PORT}`);
    this.logger.info(`  Log Level: ${this.LOG_LEVEL}`);
    this.logger.info(`  LLM Provider: ${this.LLM_PROVIDER}`);
    this.logger.info(`  Skyvern Mode: ${this.SKYVERN_MODE}`);
    this.logger.info(`  Skyvern URL: ${this.SKYVERN_BASE_URL}`);
    this.logger.info(`  Skyvern Enabled: ${this.SKYVERN_ENABLED}`);
    this.logger.info(`  Embedding Model: ${this.EMBEDDING_MODEL}`);
    
    if (this.LINKEDIN_EMAIL) {
      this.logger.info(`  LinkedIn Login: Configured`);
    }
    
    if (this.INTERNSHALA_EMAIL) {
      this.logger.info(`  Internshala Login: Configured`);
    }
  }

  /**
   * Get sensitive config value (never log)
   */
  getApiKey(provider: 'gemini' | 'openai'): string | undefined {
    return provider === 'gemini' ? this.GEMINI_API_KEY : this.OPENAI_API_KEY;
  }
}
