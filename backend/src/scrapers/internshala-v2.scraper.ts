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
  stipend?: string;
  duration?: string;
}

export interface ScrapeOptions {
  maxJobs?: number;
  skills?: string[];
  location?: string;
  includeRemote?: boolean;
  includeInternships?: boolean;
  includeJobs?: boolean;
}

@Injectable()
export class InternshalaScraperV2 {
  private browser: Browser | null = null;

  constructor(@InjectPinoLogger('InternshalaScraperV2') private readonly logger: PinoLogger) {
    logger.setContext('InternshalaScraperV2');
  }

  // Category mapping for common skills
  private readonly skillToCategory: Record<string, string> = {
    'python': 'python',
    'javascript': 'javascript',
    'java': 'java',
    'react': 'reactjs',
    'node': 'nodejs',
    'nodejs': 'nodejs',
    'angular': 'angular',
    'vue': 'vuejs',
    'django': 'django',
    'flask': 'flask',
    'machine learning': 'machine%20learning',
    'ml': 'machine%20learning',
    'data science': 'data%20science',
    'data analyst': 'data%20science',
    'web development': 'web%20development',
    'frontend': 'front%20end%20development',
    'backend': 'back%20end%20development',
    'fullstack': 'full%20stack%20development',
    'full stack': 'full%20stack%20development',
    'android': 'android%20app%20development',
    'ios': 'ios%20app%20development',
    'mobile': 'mobile%20app%20development',
    'ui/ux': 'ui%20ux%20design',
    'ui ux': 'ui%20ux%20design',
    'graphic design': 'graphic%20design',
    'content writing': 'content%20writing',
    'digital marketing': 'digital%20marketing',
    'marketing': 'marketing',
    'sales': 'sales',
    'hr': 'human%20resources%20(hr)',
    'finance': 'finance',
    'accounting': 'accounts',
    'sql': 'sql',
    'mongodb': 'mongodb',
    'aws': 'amazon%20web%20services%20(aws)',
    'devops': 'devops',
    'cloud': 'cloud%20computing',
    'cybersecurity': 'cyber%20security',
    'blockchain': 'blockchain',
    'ai': 'artificial%20intelligence',
    'nlp': 'natural%20language%20processing%20(nlp)',
    'deep learning': 'deep%20learning',
    'c++': 'c%2B%2B',
    'c#': 'c%23',
    '.net': 'asp.net',
    'php': 'php',
    'ruby': 'ruby%20on%20rails',
    'go': 'golang',
    'rust': 'rust',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'typescript': 'typescript',
  };

  /**
   * Build search URLs based on user skills
   */
  private buildSearchUrls(options: ScrapeOptions): string[] {
    const urls: string[] = [];
    const baseUrl = 'https://internshala.com';

    // Map skills to Internshala categories
    const categories = new Set<string>();

    if (options.skills && options.skills.length > 0) {
      for (const skill of options.skills) {
        const normalized = skill.toLowerCase().trim();
        if (this.skillToCategory[normalized]) {
          categories.add(this.skillToCategory[normalized]);
        }
      }
    }

    // If no skills matched, use general categories
    if (categories.size === 0) {
      categories.add('web%20development');
      categories.add('python');
      categories.add('data%20science');
    }

    // Build URLs for internships
    if (options.includeInternships !== false) {
      for (const category of categories) {
        let url = `${baseUrl}/internships/${category}-internship`;
        if (options.includeRemote) {
          url += '/work-from-home';
        }
        urls.push(url);
      }
      // Also add general internships page
      urls.push(`${baseUrl}/internships/`);
    }

    // Build URLs for jobs
    if (options.includeJobs) {
      for (const category of categories) {
        let url = `${baseUrl}/jobs/${category}-jobs`;
        if (options.includeRemote) {
          url += '/work-from-home';
        }
        urls.push(url);
      }
    }

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Main scraping function with skill-based filtering
   */
  async scrapeJobs(maxJobs: number = 200, options: ScrapeOptions = {}): Promise<ScrapedJob[]> {
    this.logger.info('🚀 Starting Internshala scraping (V2 - Enhanced)...');

    const allJobs = new Map<string, ScrapedJob>(); // Use Map for deduplication

    try {
      this.browser = await chromium.launch({
        headless: true, // Run headless for performance
        args: ['--disable-blink-features=AutomationControlled'],
      });

      const context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();

      // Build search URLs based on skills
      const searchUrls = this.buildSearchUrls({
        ...options,
        skills: options.skills || [],
        includeInternships: true,
        includeRemote: true,
      });

      this.logger.info(`📋 Will search ${searchUrls.length} category pages`);

      // Scrape each category URL
      for (const url of searchUrls) {
        if (allJobs.size >= maxJobs) break;

        try {
          this.logger.info(`🌐 Scraping: ${url}`);
          const jobs = await this.scrapeFromUrl(page, url, maxJobs - allJobs.size);

          // Add to Map (automatically handles duplicates by externalId)
          for (const job of jobs) {
            if (!allJobs.has(job.externalId)) {
              allJobs.set(job.externalId, job);
            }
          }

          this.logger.info(`✓ Total unique jobs so far: ${allJobs.size}`);

          // Small delay between pages
          await page.waitForTimeout(1000);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error scraping ${url}: ${errorMessage}`);
        }
      }

      this.logger.info(`✅ Scraped ${allJobs.size} unique jobs from Internshala`);
      return Array.from(allJobs.values());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error scraping Internshala: ${errorMessage}`);
      return [];
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Scrape jobs from a single URL with infinite scroll support
   */
  private async scrapeFromUrl(page: Page, url: string, maxJobs: number): Promise<ScrapedJob[]> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const jobs: ScrapedJob[] = [];
    let previousJobCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10; // Limit scrolling

    // Keep scrolling until we have enough jobs or no more loading
    while (jobs.length < maxJobs && scrollAttempts < maxScrollAttempts) {
      // Find all job cards currently on page
      const jobCards = await page.$$('.individual_internship, .individual_internship_details, .internship_meta');

      this.logger.info(`  Found ${jobCards.length} job cards on page`);

      // Scrape new job cards
      for (let i = jobs.length; i < Math.min(jobCards.length, maxJobs); i++) {
        try {
          const job = await this.scrapeJobCard(page, jobCards[i], i);
          if (job && !jobs.find(j => j.externalId === job.externalId)) {
            jobs.push(job);
          }
        } catch (error) {
          // Skip failed cards
        }
      }

      // Check if we got new jobs
      if (jobs.length === previousJobCount) {
        scrollAttempts++;
      } else {
        scrollAttempts = 0; // Reset if we found new jobs
      }
      previousJobCount = jobs.length;

      // Scroll down to load more
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1500);

      // Try clicking "Load More" button if exists
      try {
        const loadMoreBtn = await page.$('#load_more_internships, .load_more_btn, button:has-text("Load More")');
        if (loadMoreBtn && await loadMoreBtn.isVisible()) {
          await loadMoreBtn.click();
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // No load more button, continue scrolling
      }
    }

    return jobs;
  }

  /**
   * Scrape details from a single job card
   */
  private async scrapeJobCard(page: Page, card: any, index: number): Promise<ScrapedJob | null> {
    try {
      // Title - try multiple selectors
      let title = '';
      for (const selector of ['.profile h3 a', '.heading_4_5 a', 'h3 a', '.job-title a', '.internship_heading a']) {
        const el = await card.$(selector);
        if (el) {
          title = (await el.textContent())?.trim() || '';
          if (title) break;
        }
      }
      if (!title) return null;

      // Company
      let company = 'Unknown';
      for (const selector of ['.company-name', '.company_name', 'a.link_display_like_text', '.company']) {
        const el = await card.$(selector);
        if (el) {
          company = (await el.textContent())?.trim() || 'Unknown';
          if (company !== 'Unknown') break;
        }
      }

      // Link/URL
      let href = '';
      for (const selector of ['a.view_detail_button', 'a[href*="/internship/detail/"]', 'a[href*="/job/detail/"]', '.profile a', 'h3 a']) {
        const el = await card.$(selector);
        if (el) {
          href = await el.getAttribute('href') || '';
          if (href && (href.includes('/internship/') || href.includes('/job/'))) break;
        }
      }
      if (!href) return null;

      const url = href.startsWith('http') ? href : `https://internshala.com${href}`;

      // Extract externalId from URL
      const externalId = href.split('/').filter(Boolean).pop() || `job_${Date.now()}_${index}`;

      // Location
      let location: string | undefined;
      for (const selector of ['.location_link', '[id^="location"]', '.locations a', '.location']) {
        const el = await card.$(selector);
        if (el) {
          location = (await el.textContent())?.trim();
          if (location) break;
        }
      }

      // Stipend
      let stipend: string | undefined;
      for (const selector of ['.stipend', '.salary', '.stipend_container_table_cell']) {
        const el = await card.$(selector);
        if (el) {
          stipend = (await el.textContent())?.trim();
          if (stipend) break;
        }
      }

      // Duration
      let duration: string | undefined;
      for (const selector of ['.other_detail_item:has-text("Duration")', '.duration']) {
        const el = await card.$(selector);
        if (el) {
          duration = (await el.textContent())?.trim();
          if (duration) break;
        }
      }

      // Build description from available info
      const descParts = [title];
      if (location) descParts.push(`Location: ${location}`);
      if (stipend) descParts.push(`Stipend: ${stipend}`);
      if (duration) descParts.push(`Duration: ${duration}`);
      const description = descParts.join(' | ');

      return {
        externalId,
        title,
        company,
        description,
        url,
        location,
        stipend,
        duration,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Scrape with user skills context
   */
  async scrapeForUser(userSkills: string[], maxJobs: number = 300): Promise<ScrapedJob[]> {
    this.logger.info(`🎯 Scraping for user with skills: ${userSkills.join(', ')}`);

    return this.scrapeJobs(maxJobs, {
      skills: userSkills,
      includeInternships: true,
      includeJobs: true,
      includeRemote: true,
    });
  }
}
