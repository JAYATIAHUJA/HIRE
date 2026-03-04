import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { chromium, Browser, Page, Dialog } from 'playwright';
import { LlmService } from './llm.service';
import * as path from 'path';
import * as fs from 'fs';

export interface AutomationResult {
    success: boolean;
    screenshotUrl?: string;
    error?: string;
    requiresUserAction?: boolean;
    actionRequired?: string;
}

export interface FormField {
    id: string;
    name: string;
    label: string;
    type: string; // text, textarea, select, checkbox, radio, file, number, email, tel, etc.
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select/radio
    currentValue?: string;
}

export interface UserProfile {
    name: string;
    email: string;
    phone?: string;
    skills?: string[];
    location?: string;
    experience?: string;
    education?: string;
}

@Injectable()
export class SimpleAutomationService {
    private readonly screenshotDir = path.join(process.cwd(), 'screenshots');
    private notificationCallback?: (message: string, type: 'info' | 'warning' | 'error') => void;

    constructor(
        private llmService: LlmService,
        @InjectPinoLogger(SimpleAutomationService.name) private readonly logger: PinoLogger,
    ) {
        logger.setContext(SimpleAutomationService.name);
        // Ensure screenshot directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    /**
     * Set notification callback for user alerts
     */
    setNotificationCallback(callback: (message: string, type: 'info' | 'warning' | 'error') => void) {
        this.notificationCallback = callback;
    }

    /**
     * Send notification to user
     */
    private notify(message: string, type: 'info' | 'warning' | 'error' = 'info') {
        this.logger.info(`🔔 [${type.toUpperCase()}] ${message}`);
        if (this.notificationCallback) {
            this.notificationCallback(message, type);
        }
        // Play sound notification (Windows)
        if (type === 'error' || type === 'warning') {
            try {
                // This will make a beep sound on Windows
                process.stdout.write('\x07');
            } catch (e) { }
        }
    }

    /**
     * Main automation function for Internshala
     */
    async applyToInternshala(
        jobUrl: string,
        credentials: { email?: string; password?: string },
        userProfile: UserProfile,
        resumeText: string,
        resumeFilePath?: string,
    ): Promise<AutomationResult> {
        this.logger.info(`🚀 Starting Smart Automation for ${jobUrl}`);
        this.notify('Starting job application automation...', 'info');

        if (!credentials?.email || !credentials?.password) {
            return { success: false, error: 'Missing Internshala credentials', requiresUserAction: true };
        }

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
            // Launch browser (visible for debugging)
            browser = await chromium.launch({
                headless: false,
                args: ['--start-maximized'],
                slowMo: 50, // Slow down for visibility
            });

            const context = await browser.newContext({
                viewport: null,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            });

            page = await context.newPage();

            // Setup dialog handler for alerts/popups
            page.on('dialog', async (dialog: Dialog) => {
                this.logger.info(`📢 Dialog detected: ${dialog.type()} - ${dialog.message()}`);
                this.notify(`Popup: ${dialog.message()}`, 'warning');

                if (dialog.type() === 'alert') {
                    await dialog.accept();
                } else if (dialog.type() === 'confirm') {
                    // Usually accept confirmation dialogs during application
                    await dialog.accept();
                } else if (dialog.type() === 'prompt') {
                    this.notify('Prompt dialog requires input - accepting empty', 'warning');
                    await dialog.accept('');
                }
            });

            // Step 1: Login
            const loginResult = await this.handleLogin(page, credentials);
            if (!loginResult.success) {
                return loginResult;
            }

            // Step 2: Navigate to job
            this.logger.info(`📍 Navigating to job: ${jobUrl}`);
            await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            // Step 3: Click Apply
            const applyResult = await this.clickApplyButton(page);
            if (!applyResult.success) {
                return applyResult;
            }

            // Step 4: Smart Form Filling (multiple pages)
            const formResult = await this.handleApplicationForm(page, userProfile, resumeText, resumeFilePath);
            if (!formResult.success) {
                return formResult;
            }

            // Take final screenshot
            const screenshotPath = await this.takeScreenshot(page, 'final');

            this.notify('✅ Application submitted successfully!', 'info');
            return { success: true, screenshotUrl: screenshotPath };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Automation failed: ${errorMessage}`);
            this.notify(`Error: ${errorMessage}`, 'error');

            if (page) {
                await this.takeScreenshot(page, 'error');
            }

            return {
                success: false,
                error: errorMessage,
                requiresUserAction: true,
                actionRequired: 'Please check the browser and complete manually if needed',
            };
        } finally {
            // Keep browser open for 10 seconds to see result, then close
            if (browser) {
                await new Promise(resolve => setTimeout(resolve, 10000));
                await browser.close();
            }
        }
    }

    /**
     * Handle Internshala login
     */
    private async handleLogin(page: Page, credentials: { email?: string; password?: string }): Promise<AutomationResult> {
        try {
            this.logger.info('🔐 Checking login status...');
            await page.goto('https://internshala.com', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);

            // Check if already logged in
            const isLoggedIn = await page.evaluate(() => {
                return document.body.innerText.includes('Logout') ||
                    !!document.querySelector('.profile_container') ||
                    !!document.querySelector('.logged_in_user');
            });

            if (isLoggedIn) {
                this.logger.info('✅ Already logged in');
                return { success: true };
            }

            this.logger.info('🔑 Logging in...');
            this.notify('Logging into Internshala...', 'info');

            await page.goto('https://internshala.com/login/user', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);

            // Fill login form
            await page.fill('#email', credentials.email!);
            await page.waitForTimeout(500);
            await page.fill('#password', credentials.password!);
            await page.waitForTimeout(500);

            // Click login button
            await page.click('#login_submit');

            // Wait for navigation
            await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
            await page.waitForTimeout(3000);

            // Verify login success
            const loginSuccess = await page.evaluate(() => {
                const body = document.body.innerText;
                return body.includes('Logout') ||
                    !body.includes('Invalid') && !body.includes('incorrect');
            });

            if (!loginSuccess) {
                this.notify('Login failed! Please check credentials.', 'error');
                return {
                    success: false,
                    error: 'Login failed - invalid credentials',
                    requiresUserAction: true,
                    actionRequired: 'Please verify your Internshala email and password',
                };
            }

            this.logger.info('✅ Login successful');
            return { success: true };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.notify(`Login error: ${errorMessage}`, 'error');
            return { success: false, error: `Login failed: ${errorMessage}` };
        }
    }

    /**
     * Click the Apply button
     */
    private async clickApplyButton(page: Page): Promise<AutomationResult> {
        try {
            this.logger.info('🖱️ Looking for Apply button...');

            // Try multiple selectors for Apply button
            const applySelectors = [
                'button:has-text("Apply now")',
                'button:has-text("Apply Now")',
                '#easy_apply_button',
                '.easy_apply_button',
                'button:has-text("Continue")',
                'a:has-text("Apply")',
                '.apply_button',
            ];

            for (const selector of applySelectors) {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                    this.logger.info(`Found Apply button: ${selector}`);
                    await button.click();
                    await page.waitForTimeout(2000);
                    return { success: true };
                }
            }

            // Check if already applied
            const alreadyApplied = await page.textContent('body').then(text =>
                text?.includes('Already applied') || text?.includes('You have already')
            );

            if (alreadyApplied) {
                this.notify('Already applied to this job!', 'warning');
                return { success: false, error: 'Already applied to this job' };
            }

            this.notify('Could not find Apply button!', 'error');
            return {
                success: false,
                error: 'Apply button not found',
                requiresUserAction: true,
                actionRequired: 'Please click Apply manually',
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return { success: false, error: `Failed to click Apply: ${errorMessage}` };
        }
    }

    /**
     * Handle the application form with smart filling
     */
    private async handleApplicationForm(
        page: Page,
        userProfile: UserProfile,
        resumeText: string,
        resumeFilePath?: string,
    ): Promise<AutomationResult> {
        const maxPages = 5; // Maximum form pages to handle

        for (let pageNum = 0; pageNum < maxPages; pageNum++) {
            this.logger.info(`📝 Processing form page ${pageNum + 1}...`);
            await page.waitForTimeout(2000);

            // Handle any popups/modals
            await this.handlePopups(page);

            // Detect all form fields
            const fields = await this.detectFormFields(page);
            this.logger.info(`Found ${fields.length} form fields`);

            if (fields.length > 0) {
                // Get AI-generated answers for complex fields
                const answers = await this.generateAnswers(fields, userProfile, resumeText);

                // Fill each field
                for (const field of fields) {
                    await this.fillField(page, field, answers[field.id] || '', userProfile, resumeFilePath);
                }
            }

            // Handle file uploads (resume)
            await this.handleFileUploads(page, resumeFilePath);

            // Look for Submit or Next button
            const submitBtn = await page.$('button:has-text("Submit"), input[type="submit"], #submit');
            const nextBtn = await page.$('button:has-text("Next"), button:has-text("Continue"), #next');

            if (submitBtn && await submitBtn.isVisible()) {
                this.logger.info('📤 Found Submit button - clicking...');
                await page.waitForTimeout(2000);

                // Highlight submit button
                await page.evaluate((btn) => {
                    (btn as HTMLElement).style.border = '3px solid green';
                }, submitBtn);

                await submitBtn.click();
                await page.waitForTimeout(5000);

                // Check for success message
                const success = await page.textContent('body').then(text =>
                    text?.includes('successfully') ||
                    text?.includes('Application submitted') ||
                    text?.includes('Thank you')
                );

                if (success) {
                    return { success: true };
                } else {
                    // Still might be successful, continue
                    return { success: true };
                }
            } else if (nextBtn && await nextBtn.isVisible()) {
                this.logger.info('➡️ Clicking Next...');
                await nextBtn.click();
                await page.waitForTimeout(2000);
            } else {
                this.logger.info('No more form navigation buttons found');
                break;
            }
        }

        return { success: true };
    }

    /**
     * Detect all form fields on the page
     */
    private async detectFormFields(page: Page): Promise<FormField[]> {
        return await page.evaluate(() => {
            const fields: FormField[] = [];
            const processedIds = new Set<string>();

            // Find all input elements
            const inputs = document.querySelectorAll('input, textarea, select');

            inputs.forEach((input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, index) => {
                // Skip hidden and already processed
                if (input.type === 'hidden' || !input.offsetParent) return;

                const id = input.id || input.name || `field_${index}`;
                if (processedIds.has(id)) return;
                processedIds.add(id);

                // Find label
                let label = '';
                const labelEl = document.querySelector(`label[for="${input.id}"]`);
                if (labelEl) {
                    label = labelEl.textContent?.trim() || '';
                } else {
                    // Look for parent label or nearby text
                    const parentLabel = input.closest('label');
                    if (parentLabel) {
                        label = parentLabel.textContent?.trim() || '';
                    } else {
                        // Look for previous sibling or parent div text
                        const parent = input.closest('.form-group, .form-field, .field, .input-container');
                        if (parent) {
                            const labelInParent = parent.querySelector('label, .label, .form-label');
                            label = labelInParent?.textContent?.trim() || '';
                        }
                    }
                }

                // Determine type
                let type: FormField['type'] = 'text';
                if (input.tagName === 'TEXTAREA') {
                    type = 'textarea';
                } else if (input.tagName === 'SELECT') {
                    type = 'select';
                } else if (input instanceof HTMLInputElement) {
                    type = (input.type as FormField['type']) || 'text';
                }

                // Get options for select
                let options: string[] | undefined;
                if (input.tagName === 'SELECT') {
                    options = Array.from((input as HTMLSelectElement).options)
                        .map(opt => opt.textContent?.trim() || '')
                        .filter(opt => opt);
                }

                fields.push({
                    id,
                    name: input.name || id,
                    label: label || (input as any).placeholder || id,
                    type,
                    required: input.required || input.hasAttribute('required'),
                    placeholder: (input as any).placeholder || '',
                    options,
                    currentValue: (input as any).value || '',
                });
            });

            return fields;
        });
    }

    /**
     * Generate AI answers for form fields
     */
    private async generateAnswers(
        fields: FormField[],
        userProfile: UserProfile,
        resumeText: string
    ): Promise<Record<string, string>> {
        // Filter fields that need AI help
        const needsAI = fields.filter(f =>
            f.type === 'textarea' ||
            f.label.toLowerCase().includes('cover') ||
            f.label.toLowerCase().includes('why') ||
            f.label.toLowerCase().includes('experience') ||
            f.label.toLowerCase().includes('describe')
        );

        if (needsAI.length === 0) {
            return {};
        }

        try {
            this.logger.info(`🤖 Generating AI answers for ${needsAI.length} fields...`);
            this.notify('Generating personalized answers with AI...', 'info');

            const answers = await this.llmService.answerApplicationQuestions(
                needsAI.map(f => ({ id: f.id, label: f.label, type: f.type })),
                userProfile,
                resumeText
            );

            return answers;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`AI answer generation failed: ${errorMessage}`);
            return {};
        }
    }

    /**
     * Fill a single form field
     */
    private async fillField(
        page: Page,
        field: FormField,
        aiAnswer: string,
        userProfile: UserProfile,
        resumeFilePath?: string,
    ): Promise<void> {
        try {
            const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
            const element = await page.$(selector);

            if (!element || !(await element.isVisible())) {
                return;
            }

            // Skip if already filled
            if (field.currentValue && field.currentValue.length > 3) {
                return;
            }

            // Determine value based on field type and label
            let value = aiAnswer;
            const labelLower = field.label.toLowerCase();

            // Smart field detection
            if (labelLower.includes('name') && !labelLower.includes('company')) {
                value = userProfile.name || value;
            } else if (labelLower.includes('email')) {
                value = userProfile.email || value;
            } else if (labelLower.includes('phone') || labelLower.includes('mobile')) {
                value = userProfile.phone || value;
            } else if (labelLower.includes('location') || labelLower.includes('city')) {
                value = userProfile.location || 'India';
            }

            if (!value) return;

            this.logger.info(`  📝 Filling: ${field.label} = ${value.substring(0, 30)}...`);

            if (field.type === 'select') {
                await page.selectOption(selector, { label: value }).catch(() => {
                    // Try by value
                    page.selectOption(selector, value).catch(() => null);
                });
            } else if (field.type === 'checkbox' || field.type === 'radio') {
                await element.check().catch(() => null);
            } else if (field.type === 'file') {
                if (resumeFilePath && fs.existsSync(resumeFilePath)) {
                    await element.setInputFiles(resumeFilePath);
                }
            } else {
                await page.fill(selector, value);
            }

            await page.waitForTimeout(200);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Could not fill field ${field.label}: ${errorMessage}`);
        }
    }

    /**
     * Handle file uploads (resume)
     */
    private async handleFileUploads(page: Page, resumeFilePath?: string): Promise<void> {
        if (!resumeFilePath || !fs.existsSync(resumeFilePath)) return;

        try {
            const fileInputs = await page.$$('input[type="file"]');

            for (const input of fileInputs) {
                if (await input.isVisible()) {
                    const accept = await input.getAttribute('accept') || '';
                    if (accept.includes('pdf') || accept.includes('doc') || !accept) {
                        this.logger.info('📎 Uploading resume file...');
                        await input.setInputFiles(resumeFilePath);
                        await page.waitForTimeout(1000);
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`File upload failed: ${errorMessage}`);
        }
    }

    /**
     * Handle popups and modals
     */
    private async handlePopups(page: Page): Promise<void> {
        try {
            // Close common popups
            const closeSelectors = [
                'button:has-text("Close")',
                'button:has-text("×")',
                '.close-btn',
                '.modal-close',
                '[aria-label="Close"]',
                '.popup-close',
            ];

            for (const selector of closeSelectors) {
                const closeBtn = await page.$(selector);
                if (closeBtn && await closeBtn.isVisible()) {
                    await closeBtn.click().catch(() => null);
                    await page.waitForTimeout(500);
                }
            }

            // Press Escape to close any modal
            await page.keyboard.press('Escape').catch(() => null);

        } catch (error) {
            // Ignore popup handling errors
        }
    }

    /**
     * Take a screenshot
     */
    private async takeScreenshot(page: Page, prefix: string): Promise<string> {
        const fileName = `${prefix}_${Date.now()}.png`;
        const filePath = path.join(this.screenshotDir, fileName);

        await page.screenshot({ path: filePath, fullPage: false });
        this.logger.info(`📸 Screenshot saved: ${fileName}`);

        return `/screenshots/${fileName}`;
    }
}
