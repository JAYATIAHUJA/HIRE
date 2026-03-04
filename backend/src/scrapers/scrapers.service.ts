import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InternshalaScraperV2 } from './internshala-v2.scraper';
import { LinkedInScraper } from './linkedin.scraper';
import { UniversalScraper } from './universal.scraper';
import { RssScraper } from './rss.scraper';
import { JobsService } from '../jobs/jobs.service';
import { JobListing } from '../jobs/entities/job-listing.entity';
import { User } from '../users/entities/user.entity';

export interface ScrapeResult {
  internshala: number;
  linkedin: number;
  rss?: number;
  removed: number;
  duration: number;
}

@Injectable()
export class ScrapersService {
  constructor(
    private internshalaScraperV2: InternshalaScraperV2,
    private linkedInScraper: LinkedInScraper,
    private universalScraper: UniversalScraper,
    private rssScraper: RssScraper,
    private jobsService: JobsService,
    @InjectRepository(JobListing)
    private jobRepository: Repository<JobListing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectPinoLogger(ScrapersService.name) private readonly logger: PinoLogger,
  ) {
    logger.setContext(ScrapersService.name);
  }

  /**
   * Full scrape: clears old jobs and scrapes fresh based on user skills
   */
  async scrapeForUser(userId: string, options: {
    maxJobs?: number;
    clearOld?: boolean;
  } = {}): Promise<ScrapeResult> {
    const startTime = Date.now();
    const maxJobs = options.maxJobs || 300;

    this.logger.info(`🚀 Starting personalized scrape for user ${userId}`);

    // Get user's skills
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const userSkills = user?.skills || [];

    this.logger.info(`📋 User skills: ${userSkills.join(', ') || 'None specified'}`);

    // Optionally clear old jobs
    let removedCount = 0;
    if (options.clearOld) {
      removedCount = await this.clearOldJobs();
    }

    // Scrape Internshala with user skills
    const internshalaJobs = await this.internshalaScraperV2.scrapeForUser(userSkills, maxJobs);
    let internshalaCount = 0;

    this.logger.info(`📥 Processing ${internshalaJobs.length} Internshala jobs...`);

    for (const job of internshalaJobs) {
      try {
        await this.jobsService.saveScrapedJob('internshala', job);
        internshalaCount++;

        // Progress log every 20 jobs
        if (internshalaCount % 20 === 0) {
          this.logger.info(`  ✓ Saved ${internshalaCount}/${internshalaJobs.length} jobs`);
        }

        // Rate limiting to avoid LLM API limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error saving job: ${errorMessage}`);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    this.logger.info(`✅ Scraping complete in ${duration}s: ${internshalaCount} jobs saved, ${removedCount} old jobs removed`);

    return {
      internshala: internshalaCount,
      linkedin: 0, // LinkedIn not scraped in personalized mode
      removed: removedCount,
      duration,
    };
  }

  /**
   * Default scrape all platforms
   */
  async scrapeAllJobs(): Promise<ScrapeResult> {
    const startTime = Date.now();

    this.logger.info('🚀 Starting job scraping for all platforms...');

    // Clear jobs older than 7 days
    const removedCount = await this.clearStaleJobs(7);

    // Scrape Internshala
    // Reduced count for faster feedback during demo/testing
    const internshalaJobs = await this.internshalaScraperV2.scrapeJobs(20); 
    let internshalaCount = 0;

    for (const job of internshalaJobs) {
      try {
        await this.jobsService.saveScrapedJob('internshala', job);
        internshalaCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error saving Internshala job: ${errorMessage}`);
      }
    }

    // Scrape LinkedIn
    // Reduced count for faster feedback
    const linkedinJobs = await this.linkedInScraper.scrapeJobs(10);
    let linkedinCount = 0;

    for (const job of linkedinJobs) {
      try {
        await this.jobsService.saveScrapedJob('linkedin', job);
        linkedinCount++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Error saving LinkedIn job: ${errorMessage}`);
      }
    }

    // Scrape RSS Feeds (We Work Remotely, Remotive)
    const rssSources = [
      { url: 'https://weworkremotely.com/remote-jobs.rss', name: 'weworkremotely' },
      { url: 'https://remotive.io/remote-jobs/feed', name: 'remotive' }
    ];

    let rssCount = 0;
    for (const source of rssSources) {
      const rssJobs = await this.rssScraper.scrapeFeed(source.url, source.name);
      for (const job of rssJobs) {
        try {
          await this.jobsService.saveScrapedJob('other', job);
          rssCount++;
        } catch (error) {
          this.logger.error(`Error saving RSS job from ${source.name}: ${error.message}`);
        }
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    this.logger.info(`✅ Scraping complete in ${duration}s: ${internshalaCount} Internshala, ${linkedinCount} LinkedIn, ${removedCount} removed`);

    return {
      internshala: internshalaCount,
      linkedin: linkedinCount,
      rss: rssCount,
      removed: removedCount,
      duration,
    };
  }

  /**
   * Clear all old jobs (complete refresh)
   */
  async clearOldJobs(): Promise<number> {
    this.logger.info('🗑️ Clearing all old Internshala jobs...');

    const result = await this.jobRepository.delete({
      platform: 'internshala' as any,
    });

    const count = result.affected || 0;
    this.logger.info(`  Removed ${count} old Internshala jobs`);
    return count;
  }

  /**
   * Clear jobs older than N days
   */
  async clearStaleJobs(days: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.logger.info(`🗑️ Clearing jobs older than ${days} days (before ${cutoffDate.toISOString()})...`);

    const result = await this.jobRepository.delete({
      createdAt: LessThan(cutoffDate),
    });

    const count = result.affected || 0;
    this.logger.info(`  Removed ${count} stale jobs`);
    return count;
  }

  /**
   * Get statistics about current job listings
   */
  async getStats(): Promise<{
    total: number;
    internshala: number;
    linkedin: number;
    recentlyUpdated: number;
  }> {
    const total = await this.jobRepository.count();
    const internshala = await this.jobRepository.count({ where: { platform: 'internshala' } });
    const linkedin = await this.jobRepository.count({ where: { platform: 'linkedin' } });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentlyUpdated = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.updatedAt > :date', { date: oneDayAgo })
      .getCount();

    return { total, internshala, linkedin, recentlyUpdated };
  }

  async scrapeUniversalJob(url: string): Promise<JobListing> {
    try {
      const scrapedJob = await this.universalScraper.scrapeJob(url);

      if (!scrapedJob) {
        throw new Error(`Could not extract job details. The site might be blocking bots or the content is not a supported job posting.`);
      }

      return await this.jobsService.saveScrapedJob('other', scrapedJob);
    } catch (error) {
      this.logger.error(`Universal scrape failed for ${url}: ${error.message}`);
      throw new Error(error.message); // Re-throw to be handled by controller
    }
  }
}
