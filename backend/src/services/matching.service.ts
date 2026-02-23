import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JobListing } from '../jobs/entities/job-listing.entity';
import { LlmService } from './llm.service';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JobListing)
    private jobRepository: Repository<JobListing>,
    private llmService: LlmService,
  ) {}

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

    // Vector similarity (cosine similarity)
    const vectorScore = this.cosineSimilarity(user.profileVector, job.descriptionVector);

    // Keyword overlap
    const keywordScore = this.computeKeywordScore(user.skills || [], job.requirements || []);

    // Final score: 70% vector, 30% keyword
    const finalScore = 0.7 * vectorScore + 0.3 * keywordScore;

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

  private computeKeywordScore(userSkills: string[], jobRequirements: string[]): number {
    if (jobRequirements.length === 0) {
      return 0.5; // Neutral score if no requirements
    }

    // Normalize to lowercase for comparison
    const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());
    const normalizedRequirements = jobRequirements.map((r) => r.toLowerCase().trim());

    // Find intersection
    const intersection = normalizedRequirements.filter((req) =>
      normalizedUserSkills.some((skill) => skill.includes(req) || req.includes(skill)),
    );

    // Score = intersection size / requirements size
    return intersection.length / normalizedRequirements.length;
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



