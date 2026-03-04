import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { ApplicationLog } from './entities/application-log.entity';
import { User } from '../users/entities/user.entity';
import { JobListing } from '../jobs/entities/job-listing.entity';
import { BrowserProfile } from '../services/entities/browser-profile.entity';
import { LlmService } from '../services/llm.service';
import { AuditLogService } from '../services/audit-log.service';
import { BrowserProfileService } from '../services/browser-profile.service';
import { BrowserProfileController } from '../services/browser-profile.controller';
import { JobsModule } from '../jobs/jobs.module';
import { UsersModule } from '../users/users.module';
import { SimpleAutomationService } from '../services/simple-automation.service';
import { AdvancedAutomationService } from '../services/advanced-automation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, ApplicationLog, User, JobListing, BrowserProfile]),
    forwardRef(() => JobsModule),
    UsersModule,
  ],
  controllers: [ApplicationsController, BrowserProfileController],
  providers: [
    ApplicationsService,
    LlmService,
    AuditLogService,
    BrowserProfileService,
    SimpleAutomationService,
    AdvancedAutomationService,
  ],
  exports: [ApplicationsService, AuditLogService, BrowserProfileService, AdvancedAutomationService],
})
export class ApplicationsModule { }



