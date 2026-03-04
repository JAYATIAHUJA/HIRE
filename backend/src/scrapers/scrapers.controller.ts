import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ScrapersService } from './scrapers.service';
import { IsUUID, IsOptional, IsBoolean, IsNumber, IsUrl } from 'class-validator';

class ScrapeUniversalDto {
  @IsUrl()
  url: string;
}

class ScrapeForUserDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsNumber()
  maxJobs?: number;

  @IsOptional()
  @IsBoolean()
  clearOld?: boolean;
}

@Controller('api/scrapers')
export class ScrapersController {
  constructor(private readonly scrapersService: ScrapersService) { }

  /**
   * Scrape jobs personalized for a specific user's skills
   */
  @Post('scrape-for-user')
  @HttpCode(HttpStatus.OK)
  async scrapeForUser(@Body() dto: ScrapeForUserDto) {
    const result = await this.scrapersService.scrapeForUser(dto.userId, {
      maxJobs: dto.maxJobs || 300,
      clearOld: dto.clearOld ?? true, // Default: clear old jobs
    });

    return {
      message: 'Personalized job scraping completed',
      ...result,
    };
  }

  /**
   * General scrape for all platforms (not personalized)
   */
  @Post('scrape-all')
  @HttpCode(HttpStatus.OK)
  async scrapeAll() {
    // Run in background, don't await
    this.scrapersService.scrapeAllJobs().catch(err => {
      console.error('Background scraping error:', err);
    });
    
    return {
      message: 'Job scraping started in background. Please check back in a few minutes.',
      status: 'started'
    };
  }

  /**
   * Universal experimental scraper
   */
  @Post('universal')
  async scrapeUniversal(@Body() dto: ScrapeUniversalDto) {
    try {
      const job = await this.scrapersService.scrapeUniversalJob(dto.url);
      return {
        message: 'Universal scraping completed',
        job,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('An unexpected error occurred during scraping');
    }
  }

  /**
   * Legacy endpoint for backward compatibility
   */
  @Post('scrape-jobs')
  @HttpCode(HttpStatus.OK)
  async scrapeJobsLegacy() {
    return this.scrapeAll();
  }

  /**
   * Get scraping statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.scrapersService.getStats();
    return {
      message: 'Job statistics',
      ...stats,
    };
  }

  /**
   * Clear old/stale jobs
   */
  @Post('clear-old')
  @HttpCode(HttpStatus.OK)
  async clearOld(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 0;

    let removed: number;
    if (daysNum > 0) {
      removed = await this.scrapersService.clearStaleJobs(daysNum);
    } else {
      removed = await this.scrapersService.clearOldJobs();
    }

    return {
      message: `Cleared ${removed} old jobs`,
      removed,
    };
  }
}
