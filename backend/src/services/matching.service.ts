import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobListing } from '../jobs/entities/job-listing.entity';
import { LlmService } from './llm.service';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JobListing)
    private jobRepository: Repository<JobListing>,
    private llmService: LlmService,
    @InjectPinoLogger(MatchingService.name) private readonly logger: PinoLogger,
  ) {
    logger.setContext(MatchingService.name);
  }

  async computeMatchScore(userId: string, jobId: string): Promise<number> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!user || !job) {
      return 0;
    }

    // Ensure vectors exist
    if (!user.profileVector || !job.descriptionVector) {
      this.logger.warn(`Missing vectors for user ${userId} or job ${jobId}`);
      return 0;
    }

    // 1. Semantic Vector Similarity (Cosine Similarity)
    const semanticScore = this.cosineSimilarity(user.profileVector, job.descriptionVector);

    // 2. Keyword & Skill Weighting Score
    const keywordScore = this.computeAdvancedKeywordScore(
      user.skills || [],
      job.requirements || [],
      job.description || ''
    );

    // 3. Experience-level matching
    const experienceScore = this.computeExperienceScore(
      user.masterResumeText || '',
      job.title || '',
      job.description || ''
    );

    // 4. Industry-specific ranking
    const industryScore = this.computeIndustryScore(
      user.masterResumeText || '',
      job.title || '',
      job.company || ''
    );

    // Final Hybrid Score
    // Weights: Semantic (40%), Keyword (30%), Experience (20%), Industry (10%)
    const finalScore = 0.4 * semanticScore + 0.3 * keywordScore + 0.2 * experienceScore + 0.1 * industryScore;

    return Math.max(0, Math.min(1, finalScore)); // Clamp between 0 and 1
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private computeAdvancedKeywordScore(userSkills: string[], jobRequirements: string[], jobDescription: string): number {
    if (jobRequirements.length === 0) {
      return 0.5; // Neutral score if no explicit requirements
    }

    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());
    const normalizedRequirements = jobRequirements.map((r) => r.toLowerCase().trim());
    const descLower = jobDescription.toLowerCase();

    let score = 0;
    let totalWeight = 0;

    for (const req of normalizedRequirements) {
      // Determine weight based on whether the requirement is mentioned in the description
      const isCore = descLower.includes(req);
      const weight = isCore ? 2 : 1;
      totalWeight += weight;

      // Check for exact match or partial match
      const exactMatch = normalizedUserSkills.includes(req);
      const partialMatch = normalizedUserSkills.some((skill) => skill.includes(req) || req.includes(skill));

      if (exactMatch) {
        score += weight;
      } else if (partialMatch) {
        score += weight * 0.5; // Partial matches get half the weight
      }
    }

    return totalWeight === 0 ? 0 : score / totalWeight;
  }

  private computeExperienceScore(resumeText: string, jobTitle: string, jobDescription: string): number {
    const resumeLower = resumeText.toLowerCase();
    const titleLower = jobTitle.toLowerCase();
    const descLower = jobDescription.toLowerCase();

    // Define experience levels
    const levels = {
      entry: ['entry level', 'junior', 'fresher', 'intern', '0-1 years', '1 year'],
      mid: ['mid level', 'intermediate', '2-3 years', '3-5 years', '2+ years', '3+ years'],
      senior: ['senior', 'lead', 'principal', 'manager', 'director', '5+ years', '7+ years', '10+ years'],
    };

    // Detect job level
    let jobLevel = 'unknown';
    if (levels.senior.some((kw) => titleLower.includes(kw) || descLower.includes(kw))) jobLevel = 'senior';
    else if (levels.mid.some((kw) => titleLower.includes(kw) || descLower.includes(kw))) jobLevel = 'mid';
    else if (levels.entry.some((kw) => titleLower.includes(kw) || descLower.includes(kw))) jobLevel = 'entry';

    // Detect user level
    let userLevel = 'unknown';
    if (levels.senior.some((kw) => resumeLower.includes(kw))) userLevel = 'senior';
    else if (levels.mid.some((kw) => resumeLower.includes(kw))) userLevel = 'mid';
    else if (levels.entry.some((kw) => resumeLower.includes(kw))) userLevel = 'entry';

    // Scoring logic
    if (jobLevel === 'unknown' || userLevel === 'unknown') return 0.5; // Neutral if cannot determine
    if (jobLevel === userLevel) return 1.0; // Perfect match

    // Partial match for adjacent levels
    if ((jobLevel === 'entry' && userLevel === 'mid') || (jobLevel === 'mid' && userLevel === 'senior')) {
      return 0.8; // Overqualified is generally okay but maybe not perfect
    }
    if ((jobLevel === 'mid' && userLevel === 'entry') || (jobLevel === 'senior' && userLevel === 'mid')) {
      return 0.4; // Underqualified
    }

    return 0.1; // Severe mismatch (e.g., senior job, entry user)
  }

  private computeIndustryScore(resumeText: string, jobTitle: string, companyName: string): number {
    const resumeLower = resumeText.toLowerCase();
    const titleLower = jobTitle.toLowerCase();
    const companyLower = companyName.toLowerCase();

    // Common tech industries/domains
    const industries = [
      'fintech',
      'healthcare',
      'ecommerce',
      'edtech',
      'saas',
      'ai',
      'machine learning',
      'blockchain',
      'cybersecurity',
      'gaming',
      'web3',
      'cloud',
    ];

    const jobIndustries = industries.filter((ind) => titleLower.includes(ind) || companyLower.includes(ind));

    if (jobIndustries.length === 0) {
      return 0.5; // Neutral if no specific industry detected
    }

    // Check if user has experience in these industries
    const matchedIndustries = jobIndustries.filter((ind) => resumeLower.includes(ind));

    return matchedIndustries.length / jobIndustries.length;
  }

  async ensureUserProfileVector(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || user.profileVector) {
      return; // Already has vector
    }

    // Generate profile text
    const profileText = `${user.masterResumeText}\n\nSkills: ${(user.skills || []).join(', ')}`;

    // Generate embedding
    try {
      const embedding = await this.llmService.generateEmbedding(profileText);
      // Update user
      user.profileVector = embedding;
      await this.userRepository.save(user);
    } catch (error) {
      console.warn(`Failed to generate profile embedding for user ${userId}: ${error.message}`);
      // Fallback: Use zero vector so feed can load
      user.profileVector = new Array(768).fill(0);
      await this.userRepository.save(user);
    }
  }

  async ensureJobDescriptionVector(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job || job.descriptionVector) {
      return; // Already has vector
    }

    // Generate embedding
    try {
      const embedding = await this.llmService.generateEmbedding(job.description);
      // Update job
      job.descriptionVector = embedding;
      await this.jobRepository.save(job);
    } catch (error) {
      console.warn(`Failed to generate job embedding for job ${jobId}: ${error.message}`);
      // Fallback: Use zero vector
      job.descriptionVector = new Array(768).fill(0);
      await this.jobRepository.save(job);
    }
  }
}



