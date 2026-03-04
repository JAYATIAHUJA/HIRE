import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { chromium, Browser, Page } from 'playwright';

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  url: string;
  location?: string;
}

@Injectable()
export class LinkedInScraper {
  private browser: Browser | null = null;

  constructor(@InjectPinoLogger(LinkedInScraper.name) private readonly logger: PinoLogger) {
    logger.setContext(LinkedInScraper.name);
  }

  async scrapeJobs(maxJobs: number = 50): Promise<ScrapedJob[]> {
    this.logger.info('Starting LinkedIn scraping...');

    try {
      this.browser = await chromium.launch({
        headless: false, // Run in visible mode for manual login
        slowMo: 100, // Slow down for visibility
      });

      const context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        storageState: process.env.LINKEDIN_SESSION_FILE || undefined, // Load saved session if exists
      });

      const page = await context.newPage();

      // Login if credentials provided
      const email = process.env.LINKEDIN_EMAIL;
      const password = process.env.LINKEDIN_PASSWORD;

      if (email && password) {
        await this.login(page, email, password);
      }

      // Navigate to jobs search
      await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=India', {
        waitUntil: 'networkidle',
      });

      // Wait for job listings
      await page.waitForSelector('.jobs-search-results-list', { timeout: 10000 }).catch(() => {
        this.logger.warn('Job listings container not found');
      });

      const jobs: ScrapedJob[] = [];
      const jobCards = await page.$$('.job-search-card');

      this.logger.info(`Found ${jobCards.length} job cards`);

      for (let i = 0; i < Math.min(jobCards.length, maxJobs); i++) {
        try {
          const job = await this.scrapeJobCard(page, jobCards[i]);
          if (job) {
            jobs.push(job);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error scraping job ${i}: ${errorMessage}`);
        }
      }

      this.logger.info(`Scraped ${jobs.length} jobs from LinkedIn`);
      return jobs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error scraping LinkedIn: ${errorMessage}`);
      return [];
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private async login(page: Page, email: string, password: string): Promise<void> {
    try {
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });

      // Fill login form
      await page.fill('input[name="session_key"]', email);
      await page.fill('input[name="session_password"]', password);
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForURL('**/feed/**', { timeout: 15000 }).catch(() => {
        this.logger.warn('Login may have failed or already logged in');
      });

      await page.waitForTimeout(3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Login error: ${errorMessage}`);
    }
  }

  private async scrapeJobCard(page: Page, card: any): Promise<ScrapedJob | null> {
    try {
      // Extract basic info
      const titleElement = await card.$('.base-search-card__title a');
      const companyElement = await card.$('.base-search-card__subtitle a');
      const locationElement = await card.$('.job-search-card__location');
      const linkElement = await card.$('.base-search-card__full-link');

      if (!titleElement) {
        return null;
      }

      const title = (await titleElement.textContent())?.trim() || '';
      const company = (await companyElement?.textContent())?.trim() || 'Unknown';
      const location = (await locationElement?.textContent())?.trim() || undefined;
      const href = await linkElement?.getAttribute('href') || await titleElement.getAttribute('href');
      const url = href?.startsWith('http') ? href : `https://www.linkedin.com${href}`;

      // Extract job ID from URL
      const jobIdMatch = url.match(/\/jobs\/view\/(\d+)/);
      const externalId = jobIdMatch ? jobIdMatch[1] : url.split('/').pop() || '';

      // Navigate to detail page for full description
      let description = '';
      try {
        const detailPage = await page.context().newPage();
        await detailPage.goto(url, { waitUntil: 'networkidle' });
        const descElement = await detailPage.$('.show-more-less-html__markup');
        description = (await descElement?.textContent())?.trim() || '';
        await detailPage.close();
      } catch (error) {
        this.logger.warn(`Could not fetch full description for ${url}`);
      }

      return {
        externalId,
        title,
        company,
        description: description || title,
        url,
        location,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error scraping job card: ${errorMessage}`);
      return null;
    }
  }
}



