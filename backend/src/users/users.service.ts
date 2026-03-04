import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LlmService } from '../services/llm.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private llmService: LlmService,
    @InjectPinoLogger(UsersService.name) private readonly logger: PinoLogger,
  ) {
    logger.setContext(UsersService.name);
  }

  async createUser(data: {
    fullname: string;
    email: string;
    masterResumeText: string;
    skills: string[];
    phone?: string;
  }): Promise<User> {
    // Check if user with this email already exists
    let user = await this.userRepository.findOne({ where: { email: data.email } });

    if (user) {
      // Update existing user
      this.logger.info(`User with email ${data.email} already exists, updating...`);
      user.fullname = data.fullname;
      user.masterResumeText = data.masterResumeText;
      user.skills = data.skills;
      if (data.phone) user.phone = data.phone;
    } else {
      // Create new user
      user = this.userRepository.create({
        fullname: data.fullname,
        email: data.email,
        masterResumeText: data.masterResumeText,
        skills: data.skills,
        phone: data.phone,
      });
    }

    await this.userRepository.save(user);

    // Generate profile vector (non-blocking - continue even if it fails)
    this.generateProfileVectorAsync(user);

    this.logger.info(`User ready: ${user.email} (id: ${user.id})`);
    return user;
  }

  /**
   * Update user's resume and skills
   */
  async updateResume(userId: string, data: {
    masterResumeText: string;
    skills?: string[];
    resumeFileUrl?: string;
    phone?: string;
  }): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return null;
    }

    user.masterResumeText = data.masterResumeText;

    if (data.skills) {
      user.skills = data.skills;
    }

    if (data.resumeFileUrl) {
      user.resumeFileUrl = data.resumeFileUrl;
    }

    if (data.phone) {
      user.phone = data.phone;
    }

    // Clear old vector so it gets regenerated
    user.profileVector = null as any;

    await this.userRepository.save(user);

    // Regenerate profile vector
    this.generateProfileVectorAsync(user);

    this.logger.info(`Resume updated for user: ${user.email}`);
    return user;
  }

  /**
   * Update user skills
   */
  async updateSkills(userId: string, skills: string[]): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return null;
    }

    user.skills = skills;
    await this.userRepository.save(user);

    // Regenerate profile vector
    this.generateProfileVectorAsync(user);

    return user;
  }

  /**
   * Generate profile vector asynchronously (non-blocking)
   */
  private async generateProfileVectorAsync(user: User): Promise<void> {
    try {
      const profileText = `${user.masterResumeText || ''}\n\nSkills: ${(user.skills || []).join(', ')}`;
      user.profileVector = await this.llmService.generateEmbedding(profileText);
      await this.userRepository.save(user);
      this.logger.info(`Profile vector generated for user: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to generate profile vector for ${user.email}: ${errorMessage}`);
    }
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: User[]; total: number }> {
    const [data, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }
}
