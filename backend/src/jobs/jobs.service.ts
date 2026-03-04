import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobListing, Platform } from './entities/job-listing.entity';
import { User } from '../users/entities/user.entity';
import { LlmService } from '../services/llm.service';
import { MatchingService } from '../services/matching.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobListing)
    private jobRepository: Repository<JobListing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private llmService: LlmService,
    private matchingService: MatchingService,
    @InjectPinoLogger(JobsService.name) private readonly logger: PinoLogger,
  ) {
    logger.setContext(JobsService.name);
  }

  async saveScrapedJob(
    platform: Platform,
    scrapedJob: {
      externalId: string;
      title: string;
      company: string;
      description: string;
      url: string;
      location?: string;
    },
  ): Promise<JobListing> {
    // Check if job already exists
    const existing = await this.jobRepository.findOne({
      where: {
        platform,
        externalId: scrapedJob.externalId,
      },
    });

    if (existing) {
      // Update existing job
      existing.title = scrapedJob.title;
      existing.company = scrapedJob.company;
      existing.description = scrapedJob.description;
      existing.url = scrapedJob.url;
      existing.location = scrapedJob.location || existing.location;

      // Extract requirements if not already done
      if (!existing.requirements || existing.requirements.length === 0) {
        existing.requirements = await this.llmService.extractRequirements(scrapedJob.description);
      }

      // Generate description vector if not exists
      if (!existing.descriptionVector) {
        existing.descriptionVector = await this.llmService.generateEmbedding(scrapedJob.description);
      }

      await this.jobRepository.save(existing);
      return existing;
    }

    // Create new job
    const requirements = await this.llmService.extractRequirements(scrapedJob.description);
    const descriptionVector = await this.llmService.generateEmbedding(scrapedJob.description);

    const job = this.jobRepository.create({
      platform,
      externalId: scrapedJob.externalId,
      title: scrapedJob.title,
      company: scrapedJob.company,
      description: scrapedJob.description,
      requirements,
      url: scrapedJob.url,
      location: scrapedJob.location,
      descriptionVector,
    });

    await this.jobRepository.save(job);
    return job;
  }

  async getFeedForUser(userId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return [];
    }

    // Ensure user has profile vector
    await this.matchingService.ensureUserProfileVector(userId);

    // Get all jobs
    const jobs = await this.jobRepository.find();

    // Compute match scores
    const jobsWithScores = await Promise.all(
      jobs.map(async (job) => {
        await this.matchingService.ensureJobDescriptionVector(job.id);
        const score = await this.matchingService.computeMatchScore(userId, job.id);
        return { job, score };
      }),
    );

    // Sort by match score (highest first, lowest last) - show ALL jobs
    const sorted = jobsWithScores
      .sort((a, b) => b.score - a.score)
      .map(({ job, score }) => ({
        jobId: job.id,
        platform: job.platform,
        title: job.title,
        company: job.company,
        matchScore: Math.round(score * 100), // Convert to percentage (0-100)
        shortSummary: job.description.substring(0, 200) + '...',
        location: job.location || 'Not specified',
      }));

    return sorted;
  }

  async findOne(id: string): Promise<JobListing | null> {
    return this.jobRepository.findOne({ where: { id } });
  }
}



