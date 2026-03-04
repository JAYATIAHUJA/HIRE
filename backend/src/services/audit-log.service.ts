import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationLog, ApplicationEvent } from '../applications/entities/application-log.entity';

/**
 * Service for audit logging of application lifecycle events
 */
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(ApplicationLog)
    private applicationLogRepository: Repository<ApplicationLog>,
    @InjectPinoLogger(AuditLogService.name) private readonly logger: PinoLogger,
  ) {
    logger.setContext(AuditLogService.name);
  }

  /**
   * Log an application event
   */
  async logEvent(
    applicationId: string,
    event: ApplicationEvent,
    message?: string,
    metadata?: Record<string, any>,
  ): Promise<ApplicationLog> {
    try {
      const log = this.applicationLogRepository.create({
        applicationId,
        event,
        message,
        metadata: this.sanitizeMetadata(metadata),
      });

      const savedLog = await this.applicationLogRepository.save(log);

      // Also log to application logger for real-time monitoring
      this.logger.info(
        `[${applicationId.substring(0, 8)}] ${event}${message ? `: ${message}` : ''}`,
        metadata ? JSON.stringify(metadata) : undefined,
      );

      return savedLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to log event ${event} for application ${applicationId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Log application created event
   */
  async logCreated(
    applicationId: string,
    userId: string,
    jobId: string,
  ): Promise<void> {
    await this.logEvent(applicationId, 'created', 'Application created', {
      userId,
      jobId,
    });
  }

  /**
   * Log resume tailored event
   */
  async logResumeTailored(
    applicationId: string,
    resumeLength: number,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'resume_tailored',
      'Resume tailored for job',
      { resumeLength },
    );
  }

  /**
   * Log Skyvern task started
   */
  async logSkyvernStarted(
    applicationId: string,
    taskId: string,
    jobUrl: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'skyvern_started',
      'Skyvern task initiated',
      { taskId, jobUrl },
    );
  }

  /**
   * Log Skyvern task paused (waiting for approval)
   */
  async logSkyvernPaused(
    applicationId: string,
    taskId: string,
    screenshotUrl?: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'skyvern_paused',
      'Skyvern task paused for approval',
      { taskId, screenshotUrl },
    );
  }

  /**
   * Log screenshot captured
   */
  async logScreenshotCaptured(
    applicationId: string,
    screenshotUrl: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'screenshot_captured',
      'Application preview screenshot captured',
      { screenshotUrl },
    );
  }

  /**
   * Log approval requested
   */
  async logApprovalRequested(applicationId: string): Promise<void> {
    await this.logEvent(
      applicationId,
      'approval_requested',
      'Waiting for user approval',
    );
  }

  /**
   * Log application approved
   */
  async logApproved(applicationId: string, userId: string): Promise<void> {
    await this.logEvent(
      applicationId,
      'approved',
      'Application approved by user',
      { userId, approvedAt: new Date().toISOString() },
    );
  }

  /**
   * Log application rejected
   */
  async logRejected(
    applicationId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'rejected',
      'Application rejected by user',
      { userId, reason, rejectedAt: new Date().toISOString() },
    );
  }

  /**
   * Log Skyvern task resumed
   */
  async logSkyvernResumed(
    applicationId: string,
    taskId: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'skyvern_resumed',
      'Skyvern task resumed for submission',
      { taskId },
    );
  }

  /**
   * Log application submitted successfully
   */
  async logSubmitted(
    applicationId: string,
    taskId: string,
    confirmationUrl?: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'submitted',
      'Application submitted successfully',
      { taskId, confirmationUrl, submittedAt: new Date().toISOString() },
    );
  }

  /**
   * Log application failed
   */
  async logFailed(
    applicationId: string,
    reason: string,
    errorDetails?: any,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'failed',
      `Application failed: ${reason}`,
      { reason, errorDetails, failedAt: new Date().toISOString() },
    );
  }

  /**
   * Log retry attempt
   */
  async logRetryAttempted(
    applicationId: string,
    attemptNumber: number,
    reason: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'retry_attempted',
      `Retry attempt ${attemptNumber}: ${reason}`,
      { attemptNumber, reason },
    );
  }

  /**
   * Log CAPTCHA detected
   */
  async logCaptchaDetected(
    applicationId: string,
    captchaType?: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'captcha_detected',
      'CAPTCHA detected - manual intervention required',
      { captchaType },
    );
  }

  /**
   * Log credentials required
   */
  async logCredentialsRequired(
    applicationId: string,
    platform: string,
  ): Promise<void> {
    await this.logEvent(
      applicationId,
      'credentials_required',
      'Login credentials required for platform',
      { platform },
    );
  }

  /**
   * Get all logs for an application
   */
  async getApplicationLogs(applicationId: string): Promise<ApplicationLog[]> {
    return this.applicationLogRepository.find({
      where: { applicationId },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Get recent logs (for debugging)
   */
  async getRecentLogs(limit: number = 100): Promise<ApplicationLog[]> {
    return this.applicationLogRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get logs by event type
   */
  async getLogsByEvent(
    event: ApplicationEvent,
    limit: number = 100,
  ): Promise<ApplicationLog[]> {
    return this.applicationLogRepository.find({
      where: { event },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(
    metadata?: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };

    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'apiKey',
      'api_key',
      'token',
      'secret',
      'credential',
    ];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
