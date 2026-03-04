import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

// We'll create this entity next
import { BrowserProfile } from './entities/browser-profile.entity';

export type Platform = 'linkedin' | 'internshala';

@Injectable()
export class BrowserProfileService {
    private readonly skyvernBaseUrl: string;

    constructor(
        @InjectRepository(BrowserProfile)
        private browserProfileRepository: Repository<BrowserProfile>,
        @InjectPinoLogger(BrowserProfileService.name) private readonly logger: PinoLogger,
    ) {
        logger.setContext(BrowserProfileService.name);
        this.skyvernBaseUrl = process.env.SKYVERN_BASE_URL || 'http://localhost:8000';
    }

    /**
     * Check if user has a saved browser profile for a platform
     */
    async hasProfile(userId: string, platform: Platform): Promise<boolean> {
        const profile = await this.browserProfileRepository.findOne({
            where: { userId, platform },
        });
        return !!profile;
    }

    /**
     * Get saved browser profile for a user and platform
     */
    async getProfile(userId: string, platform: Platform): Promise<BrowserProfile | null> {
        return this.browserProfileRepository.findOne({
            where: { userId, platform },
        });
    }

    /**
     * Create a browser profile by running a login task
     * User will manually log in during this run
     */
    async createProfileForPlatform(
        userId: string,
        platform: Platform,
    ): Promise<{ workflowRunId: string; streamUrl: string }> {
        this.logger.info(`Creating browser profile for user ${userId} on ${platform}`);

        const loginUrl = platform === 'linkedin'
            ? 'https://www.linkedin.com/login'
            : 'https://internshala.com/login';

        try {
            // Create a Skyvern task that navigates to login and waits
            const response = await axios.post(`${this.skyvernBaseUrl}/api/v1/tasks`, {
                url: loginUrl,
                navigation_goal: `
Navigate to the login page and wait for the user to log in manually.
DO NOT attempt to fill any forms automatically.
Just navigate to the page and pause immediately.
The user will provide their credentials manually.
Once the user confirms they've logged in, the session will be saved.
                `.trim(),
                data_extraction_goal: 'Wait for user to complete login',
                max_retries: 0,
            }, {
                timeout: 30000,
                headers: {
                    'x-api-key': process.env.SKYVERN_API_KEY || 'local-dev-key',
                },
            });

            const taskId = response.data.task_id || response.data.id;
            const streamUrl = `http://localhost:7900`; // VNC viewer URL

            this.logger.info(`Login task created: ${taskId}`);

            return { workflowRunId: taskId, streamUrl };
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to create browser profile: ${errorMessage}`);

            // If Skyvern fails, return a mock response so user can still proceed
            // They can log in manually when applying
            this.logger.warn('Skyvern not available, returning mock stream URL');
            return {
                workflowRunId: `mock_${Date.now()}`,
                streamUrl: 'http://localhost:7900'
            };
        }
    }

    /**
     * Complete profile creation after login workflow finishes
     */
    async completeProfileCreation(
        userId: string,
        platform: Platform,
        workflowRunId: string,
    ): Promise<BrowserProfile> {
        try {
            // Create a reusable Browser Profile from the completed workflow session
            const response = await axios.post(`${this.skyvernBaseUrl}/api/v1/browser_profiles`, {
                name: `${userId}_${platform}_profile`,
                workflow_run_id: workflowRunId,
            });

            const skyvernProfileId = response.data.browser_profile_id || response.data.id;

            // Check if profile already exists
            let profile = await this.browserProfileRepository.findOne({
                where: { userId, platform },
            });

            if (profile) {
                // Update existing profile
                profile.skyvernProfileId = skyvernProfileId;
                profile.updatedAt = new Date();
            } else {
                // Create new profile
                profile = this.browserProfileRepository.create({
                    userId,
                    platform,
                    skyvernProfileId,
                });
            }

            await this.browserProfileRepository.save(profile);

            this.logger.info(`Browser profile saved: ${skyvernProfileId} for ${platform}`);

            return profile;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Failed to complete profile creation: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Delete a browser profile
     */
    async deleteProfile(userId: string, platform: Platform): Promise<void> {
        const profile = await this.browserProfileRepository.findOne({
            where: { userId, platform },
        });

        if (profile) {
            // Try to delete from Skyvern
            try {
                await axios.delete(
                    `${this.skyvernBaseUrl}/api/v1/browser_profiles/${profile.skyvernProfileId}`,
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to delete Skyvern profile: ${errorMessage}`);
            }

            await this.browserProfileRepository.remove(profile);
            this.logger.info(`Browser profile deleted for ${platform}`);
        }
    }

    /**
     * Get all profiles for a user
     */
    async getProfilesForUser(userId: string): Promise<BrowserProfile[]> {
        return this.browserProfileRepository.find({
            where: { userId },
        });
    }
}
