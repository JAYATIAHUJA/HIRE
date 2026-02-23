import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  description: string;
  url: string;
  location?: string;
  salary?: string;
  postedAt?: Date;
  source: string;
}

@Injectable()
export class RssScraper {
  private readonly logger = new Logger(RssScraper.name);

  async scrapeFeed(feedUrl: string, sourceName: string): Promise<ScrapedJob[]> {
    this.logger.log(`Fetching RSS feed from ${sourceName}: ${feedUrl}`);
    try {
      const response = await axios.get(feedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const xml = response.data;
      return this.parseRss(xml, sourceName);
    } catch (error) {
      this.logger.error(`Failed to scrape RSS feed ${feedUrl}: ${error.message}`);
      return [];
    }
  }

  private parseRss(xml: string, sourceName: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    
    // Simple regex-based parsing to avoid heavy xml libs if not needed
    // This is robust enough for standard RSS 2.0 derived feeds like WWR/Remotive
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const items = xml.match(itemRegex) || [];

    for (const item of items) {
      try {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const guidMatch = item.match(/<guid.*?>(.*?)<\/guid>/);
        const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>([\s\S]*?)<\/description>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        
        let title = titleMatch ? titleMatch[1] : 'Unknown Job';
        const url = linkMatch ? linkMatch[1] : '';
        const rawDesc = descriptionMatch ? descriptionMatch[1] : '';
        const externalId = guidMatch ? guidMatch[1] : url;
        const pubDateStr = pubDateMatch ? pubDateMatch[1] : null;

        // Clean up title (often "Role: Company" or "Company: Role")
        let company = 'Unknown Company';
        if (title.includes(':')) {
           const parts = title.split(':');
           // Heuristic: usually "Company: Role" or "Role at Company" ??
           // WWR: "Role: Company"
           // Remotive: "Role at Company"
           if (sourceName === 'weworkremotely') { // Format is often "Company: Title" or vice versa, but WWR title tag is actually "Business Development Manager: We Work Remotely"
               // WWR actual format in RSS: <title>Job Title: Company Name</title>
               const split = title.split(':');
               if (split.length >= 2) {
                   title = split[0].trim();
                   company = split.slice(1).join(':').trim();
               }
           }
        }
        
        // Improve Company Extraction if possible via other tags usually found in description or CDATA
        // (For now, simple title splitting is okay, can be improved)

        if (url) {
            jobs.push({
                externalId,
                title,
                company,
                description: rawDesc, // Keep HTML for description as backend supports it? Or strip it? 
                // Mostly the backend saves it as text. Let's strip tags slightly?
                // Actually matching service prefers raw text, but database stores string.
                // Let's keep it somewhat raw but decode entities if needed.
                url,
                location: 'Remote', // RSS feeds are usually remote jobs
                postedAt: pubDateStr ? new Date(pubDateStr) : new Date(),
                source: sourceName
            });
        }
      } catch (e) {
        this.logger.warn(`Failed to parse RSS item: ${e.message}`);
      }
    }

    return jobs;
  }
}
