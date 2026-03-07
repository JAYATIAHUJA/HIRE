import { Controller, Get, Query, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { ApplicationsService } from '../applications/applications.service';
import { IsUUID, IsString, IsOptional } from 'class-validator';

class ManualJobDto {
  @IsString()
  platform: string;

  @IsString()
  externalId: string;

  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsString()
  description: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  location?: string;
}

class CredentialsDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

class SwipeRightDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  jobId: string;

  @IsOptional()
  credentials?: CredentialsDto;
}

@ApiTags('jobs')
@Controller('api')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationsService: ApplicationsService,
  ) { }

  @Get('feed')
  async getFeed(@Query('userId') userId: string) {
    if (!userId) {
      return { error: 'userId is required' };
    }

    const feed = await this.jobsService.getFeedForUser(userId);
    return feed;
  }

  /**
   * Swipe right on a job - create an application
   */
  @Post('swipe-right')
  @HttpCode(HttpStatus.OK)
  async swipeRight(@Body() dto: SwipeRightDto) {
    const application = await this.applicationsService.createApplication(
      dto.userId,
      dto.jobId,
      dto.credentials,
    );

    return {
      id: application.id,
      status: application.status,
      message: 'Application created successfully',
    };
  }

  @Post('jobs/manual-add')
  async manualAddJob(@Body() dto: ManualJobDto) {
    const job = await this.jobsService.saveScrapedJob(
      dto.platform as 'internshala' | 'linkedin',
      {
        externalId: dto.externalId,
        title: dto.title,
        company: dto.company,
        description: dto.description,
        url: dto.url,
        location: dto.location,
      },
    );

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      url: job.url,
    };
  }
}



