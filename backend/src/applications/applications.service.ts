import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import { User } from '../users/entities/user.entity';
import { JobListing } from '../jobs/entities/job-listing.entity';
import { LlmService } from '../services/llm.service';
import { SimpleAutomationService } from '../services/simple-automation.service';
import { AuditLogService } from '../services/audit-log.service';
import { JobsService } from '../jobs/jobs.service';
import { UsersService } from '../users/users.service';
import { sanitizeErrorMessage } from '../common/utils/error-sanitizer.util';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private readonly resumesDir = path.join(process.cwd(), 'resumes');
  private readonly maxRetries = 3;

  constructor(
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JobListing)
    private jobRepository: Repository<JobListing>,
    private llmService: LlmService,
    private simpleAutomation: SimpleAutomationService,
    private auditLogService: AuditLogService,
    private jobsService: JobsService,
    private usersService: UsersService,
  ) {
    // Ensure resumes directory exists
    if (!fs.existsSync(this.resumesDir)) {
      fs.mkdirSync(this.resumesDir, { recursive: true });
    }
  }

  async createApplication(
    userId: string,
    jobId: string,
    credentials?: { email?: string; password?: string }
  ): Promise<Application> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if application already exists
    const existing = await this.applicationRepository.findOne({
      where: { userId, jobId },
    });

    if (existing) {
      this.logger.log(`Application already exists for user ${userId} and job ${jobId}`);
      return existing;
    }

    // Create application with Drafting status
    const application = this.applicationRepository.create({
      userId,
      jobId,
      status: 'Drafting',
      retryCount: 0,
    });

    await this.applicationRepository.save(application);

    // Log creation
    await this.auditLogService.logCreated(application.id, userId, jobId);

    // Asynchronously process the application (don't block response)
    this.processApplication(application.id, user, job, credentials).catch((error) => {
      this.logger.error(
        `Background processing failed for application ${application.id}: ${error.message}`,
      );
    });

    return application;
  }

  /**
   * Background processing: tailor resume and run Playwright automation
   */
  private async processApplication(
    applicationId: string,
    user: User,
    job: JobListing,
    credentials?: { email?: string; password?: string },
  ): Promise<void> {
    try {
      const application = await this.applicationRepository.findOne({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      // Step 1: Tailor resume
      this.logger.log(`Tailoring resume for application ${applicationId}`);
      let tailoredResume: string;

      try {
        tailoredResume = await this.llmService.tailorResume(
          user.masterResumeText,
          job.description,
          job.requirements || [],
        );
        this.logger.log('✅ Resume tailored successfully');
      } catch (error) {
        this.logger.warn(`⚠️ LLM tailoring failed (${error.message}), using master resume`);
        tailoredResume = user.masterResumeText;
      }

      // Save tailored resume
      const resumeFileName = `resume_${application.id}.txt`;
      const resumePath = path.join(this.resumesDir, resumeFileName);
      fs.writeFileSync(resumePath, tailoredResume, 'utf-8');
      const resumeUrl = `/resumes/${resumeFileName}`;

      application.tailoredResume = tailoredResume;
      application.tailoredResumeUrl = resumeUrl;
      await this.applicationRepository.save(application);

      await this.auditLogService.logResumeTailored(application.id, tailoredResume.length);

      // Step 2: Run Playwright automation
      if (!credentials?.email || !credentials?.password) {
        this.logger.log('No credentials provided - marking as NeedsApproval for manual submission');
        await this.transitionTo(application, 'NeedsApproval');
        await this.auditLogService.logApprovalRequested(application.id);
        return;
      }

      // Build user profile
      const userProfile = {
        name: user.fullname,
        email: user.email,
        skills: user.skills || [],
      };

      this.logger.log('🚀 Starting Playwright Automation...');

      try {
        const result = await this.simpleAutomation.applyToInternshala(
          job.url,
          credentials,
          userProfile,
          tailoredResume,
        );

        if (result.success) {
          this.logger.log('✅ Application submitted successfully!');
          application.previewScreenshotUrl = result.screenshotUrl;
          await this.transitionTo(application, 'Submitted');
          await this.auditLogService.logSubmitted(application.id, 'Playwright');
        } else {
          this.logger.warn(`⚠️ Automation failed: ${result.error}`);
          // Sanitize error message before storing for client exposure
          const safeError = sanitizeErrorMessage(new Error(result.error || 'Automation failed'), 'Application processing failed');
          await this.transitionTo(application, 'Failed', safeError);
          await this.auditLogService.logFailed(application.id, result.error || 'Automation failed');
        }
      } catch (error) {
        this.logger.error(`Playwright error: ${error.message}`);
        // Sanitize error message before storing for client exposure
        const safeError = sanitizeErrorMessage(error, 'Application processing failed');
        await this.transitionTo(application, 'Failed', safeError);
        await this.auditLogService.logFailed(application.id, error.message);
      }
    } catch (error) {
      await this.handleError(applicationId, error);
    }
  }

  async findOne(id: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: { id },
      relations: ['user', 'job'],
    });
  }

  async findByUser(userId: string): Promise<Application[]> {
    return this.applicationRepository.find({
      where: { userId },
      relations: ['job', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByStatus(status: ApplicationStatus, userId?: string): Promise<Application[]> {
    const where: any = { status };
    if (userId) {
      where.userId = userId;
    }

    return this.applicationRepository.find({
      where,
      relations: ['user', 'job'],
      order: { createdAt: 'DESC' },
    });
  }

  async approveApplication(id: string, userId?: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user', 'job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== 'NeedsApproval') {
      throw new BadRequestException(
        `Cannot approve application in ${application.status} state`,
      );
    }

    // Mark as submitted (manual approval without automation)
    await this.transitionTo(application, 'Submitted');
    await this.auditLogService.logApproved(application.id, userId || 'system');
    await this.auditLogService.logSubmitted(application.id, 'manual');

    return application;
  }

  async rejectApplication(id: string, userId: string, reason?: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== 'NeedsApproval') {
      throw new BadRequestException(
        `Cannot reject application in ${application.status} state`,
      );
    }

    await this.auditLogService.logRejected(application.id, userId, reason);
    await this.transitionTo(application, 'Failed', reason || 'Rejected by user');

    return application;
  }

  async retryApplication(
    id: string,
    credentials?: { email?: string; password?: string }
  ): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['user', 'job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== 'Failed') {
      throw new BadRequestException('Only failed applications can be retried');
    }

    if (application.retryCount >= this.maxRetries) {
      throw new BadRequestException(
        `Maximum retry attempts (${this.maxRetries}) reached`,
      );
    }

    application.retryCount += 1;
    application.failureReason = null;
    await this.transitionTo(application, 'Drafting');

    await this.auditLogService.logRetryAttempted(
      application.id,
      application.retryCount,
      'User initiated retry',
    );

    // Restart processing
    this.processApplication(application.id, application.user, application.job, credentials).catch(
      (error) => {
        this.logger.error(
          `Retry processing failed for application ${application.id}: ${error.message}`,
        );
      },
    );

    return application;
  }

  async getApplicationLogs(id: string) {
    return this.auditLogService.getApplicationLogs(id);
  }

  private async transitionTo(
    application: Application,
    newStatus: ApplicationStatus,
    failureReason?: string,
  ): Promise<void> {
    const oldStatus = application.status;
    application.status = newStatus;

    if (newStatus === 'Submitted') {
      application.submittedAt = new Date();
    }

    if (newStatus === 'Failed' && failureReason) {
      application.failureReason = failureReason;
    }

    await this.applicationRepository.save(application);

    this.logger.log(`Application ${application.id}: ${oldStatus} → ${newStatus}`);
  }

  private async handleError(applicationId: string, error: any): Promise<void> {
    this.logger.error(
      `Error processing application ${applicationId}: ${error.message}`,
      error.stack,
    );

    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) return;

    // Sanitize error message before storing for client exposure
    const safeError = sanitizeErrorMessage(error, 'Application processing failed');
    await this.transitionTo(application, 'Failed', safeError);
    await this.auditLogService.logFailed(applicationId, error.message);
  }
}
