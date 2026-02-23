import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import { LlmService } from '../services/llm.service';

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  url: string;
  location?: string;
  requirements?: string[];
  employmentType?: string;
  salary?: string;
  postedAt?: Date;
  source: 'schema.org' | 'llm' | 'meta';
}

@Injectable()
export class UniversalScraper {
  private readonly logger = new Logger(UniversalScraper.name);
  private browser: Browser | null = null;

  constructor(private llmService: LlmService) {}

  async scrapeJob(rawUrl: string): Promise<ScrapedJob | null> {
    const url = this.normalizeUrl(rawUrl);
    this.logger.log(`Starting universal scrape for: ${url} (original: ${rawUrl})`);
    
    try {
      this.browser = await chromium.launch({
        headless: true,
      });

      const context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();
      
      try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e) {
          this.logger.warn(`Navigation timeout or error for ${url}, attempting to proceed with loaded content.`);
      }

      // Strategy 1: Schema.org JSON-LD
      const schemaJob = await this.extractSchemaOrg(page, url);
      if (schemaJob) {
        this.logger.log(`Found Schema.org data for ${url}`);
        return schemaJob;
      }

      // Strategy 2: LLM Extraction from raw text
      this.logger.log(`Schema.org failed or incomplete, attempting LLM extraction for ${url}`);
      
      // Get cleaner text content (exclude scripts, styles, etc.)
      const text = await page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        const toRemove = clone.querySelectorAll('script, style, noscript, header, footer, nav, iframe, button, svg, input');
        toRemove.forEach(el => el.remove());
        return clone.innerText.replace(/\s+/g, ' ').trim().slice(0, 20000); // Limit to 20k chars, cleaned
      });

      const llmJob = await this.llmService.extractJobDetailsFromText(text, url);
      
      if (llmJob) {
        return {
          externalId: url, // Use URL as ID for generic extraction
          title: llmJob.title || 'Unknown Title',
          company: llmJob.company || 'Unknown Company',
          description: llmJob.description || 'No description provided',
          url: url,
          location: llmJob.location,
          requirements: llmJob.requirements,
          employmentType: llmJob.employmentType,
          salary: llmJob.salary,
          postedAt: llmJob.postedAt ? new Date(llmJob.postedAt) : undefined,
          source: 'llm'
        };
      }

      this.logger.warn(`Failed to extract job details from ${url}`);
      return null;

    } catch (error) {
      this.logger.error(`Error scraping ${url}: ${error.message}`);
      return null;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  private normalizeUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        // Normalize LinkedIn URLs
        if (urlObj.hostname.includes('linkedin.com')) {
            // Check for currentJobId param
            const currentJobId = urlObj.searchParams.get('currentJobId');
            if (currentJobId) {
                return `https://www.linkedin.com/jobs/view/${currentJobId}`;
            }
        }
        return url;
    } catch (e) {
        return url;
    }
  }

  private async extractSchemaOrg(page: Page, url: string): Promise<ScrapedJob | null> {
    try {
      const jsonLds = await page.$$eval('script[type="application/ld+json"]', (scripts) => {
        return scripts.map(s => {
            try {
                return JSON.parse(s.textContent || '{}');
            } catch (e) {
                return {};
            }
        });
      });

      // Flatten the results in case some script tags contain arrays or graphs
      const allObjects: any[] = [];
      for (const item of jsonLds) {
        if (Array.isArray(item)) {
            allObjects.push(...item);
        } else if (item['@graph'] && Array.isArray(item['@graph'])) {
            allObjects.push(...item['@graph']);
        } else {
            allObjects.push(item);
        }
      }

      const jobPosting = allObjects.find(json => 
        json['@type'] === 'JobPosting' || 
        (Array.isArray(json['@type']) && json['@type'].includes('JobPosting'))
      );

      if (jobPosting) {
        return {
          externalId: jobPosting.identifier?.value || url,
          title: jobPosting.title,
          company: typeof jobPosting.hiringOrganization === 'object' ? jobPosting.hiringOrganization.name : jobPosting.hiringOrganization,
          description: jobPosting.description, // Often contains HTML, might need cleaning
          url: url,
          location: this.parseSchemaLocation(jobPosting.jobLocation),
          employmentType: jobPosting.employmentType,
          postedAt: jobPosting.datePosted ? new Date(jobPosting.datePosted) : undefined,
          source: 'schema.org'
        };
      }
    } catch (e) {
      this.logger.warn(`Error extracting Schema.org: ${e.message}`);
    }
    return null;
  }

  private parseSchemaLocation(location: any): string | undefined {
    if (!location) return undefined;
    if (typeof location === 'string') return location;
    if (location.address) {
      if (typeof location.address === 'string') return location.address;
      const addr = location.address;
      return [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
    }
    return undefined;
  }
}
