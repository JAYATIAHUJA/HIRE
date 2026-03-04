// Optimized AdvancedAutomationService
import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { User } from '../users/entities/user.entity';
import { Page, chromium, Browser } from 'playwright';
import { LlmService } from './llm.service';
import * as path from 'path';
import * as fs from 'fs';

export interface FormField {
    id: string; // Unique ID to track answering
    uniqueSelector: string; // CSS selector to target the element
    type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'button' | 'unknown';
    label: string;
    value?: string;
    options?: string[]; // For select, radio
    required: boolean;
    isVisible: boolean;
}

export interface AutomationContext {
    userProfile: User;
    resumeText: string;
    resumePath?: string;
}

@Injectable()
export class AdvancedAutomationService {
    private readonly screenshotDir = path.join(process.cwd(), 'screenshots');

    constructor(
        @InjectPinoLogger(AdvancedAutomationService.name) private readonly logger: PinoLogger,
        private llmService: LlmService
    ) {
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    async applyToGenericJob(
        jobUrl: string,
        context: AutomationContext
    ): Promise<{ success: boolean; message: string; screenshotUrl?: string }> {
        this.logger.info(`🚀 Starting Advanced Automation for ${jobUrl}`);
        
        const browser: Browser = await chromium.launch({
            headless: process.env.NODE_ENV !== 'production', // Visible for debugging/demo in dev
            args: ['--start-maximized'],
        });
        
        const contextBrowser = await browser.newContext({
            viewport: null, // Full screen
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await contextBrowser.newPage();
        
        try {
            await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(3000); // Allow initial scripts to load

            // Apply logic
            const result = await this.processJobApplication(page, context);
            
            // Take screenshot
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(this.screenshotDir, `success_${timestamp}.png`);
            await page.screenshot({ path: screenshotPath });
             const screenshotUrl = `/screenshots/success_${timestamp}.png`;

            return { ...result, screenshotUrl };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Automation failed: ${msg}`);
            // Take error screenshot
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotPath = path.join(this.screenshotDir, `error_${timestamp}.png`);
                await page.screenshot({ path: screenshotPath });
            } catch (e) {
                const eMsg = e instanceof Error ? e.message : String(e);
                this.logger.warn(`Failed to take error screenshot: ${eMsg}`);
            }
            
            return { success: false, message: msg };
        } finally {
            await browser.close();
        }
    }

    /**
     * Main entry point for complex form automation
     */
    async processJobApplication(
        page: Page,
        context: AutomationContext
    ): Promise<{ success: boolean; message: string }> {
        this.logger.info('🚀 Starting Advanced Form Automation');
        
        let steps = 0;
        const maxSteps = 15; // Prevent infinite loops
        let consecutiveNoAction = 0;

        while (steps < maxSteps) {
            steps++;
            this.logger.info(`📌 Step ${steps}: Analyzing page state...`);
            
            // 1. Check for success/completion
            const pageContent = await page.content();
            if (this.detectSuccessParams(pageContent)) {
                this.logger.info('✅ Application submitted successfully!');
                return { success: true, message: 'Application submitted successfully' };
            }

            // 2. Identify actionable form fields
            const fields = await this.extractFormFields(page);
            this.logger.info(`Found ${fields.length} interactive fields`);

            // 3. Filter out fields to process
            const fieldsToProcess = fields.filter(f => {
                if (!f.isVisible || f.type === 'button') return false;
                if (f.type === 'file' && f.value) return false; // Already filled file
                if ((f.type === 'radio' || f.type === 'checkbox') && f.value === 'true') return false; // Already checked (simplified)
                if (f.value && f.value.length > 0 && f.type !== 'radio' && f.type !== 'checkbox') return false; // Already filled text/select
                return true;
            });

            if (fieldsToProcess.length > 0) {
                this.logger.info(`📝 Processing ${fieldsToProcess.length} fields...`);
                
                // 4. Generate answers using LLM
                const answers = await this.generateAnswersForFields(fieldsToProcess, context);
                
                // 5. Fill the fields
                let filledCount = 0;
                for (const field of fieldsToProcess) {
                    const answer = answers[field.id];
                    if (answer) {
                        const filled = await this.fillField(page, field, answer, context);
                        if (filled) filledCount++;
                    }
                    if (filledCount % 3 === 0) await page.waitForTimeout(300); 
                }
                
                if (filledCount > 0) {
                    consecutiveNoAction = 0;
                    // 6. Check if new fields appeared (Conditional Logic)
                    await page.waitForTimeout(1000);
                    const newFields = await this.extractFormFields(page);
                    if (newFields.length > fields.length) {
                        this.logger.info('🔄 New fields detected after filling! Repeating analysis...');
                        continue; // Loop back to analyze again
                    }
                }
            }

            // 7. Handle Navigation (Next / Submit)
            const navigationResult = await this.handleNavigation(page);
            
            if (navigationResult === 'submitting') {
                this.logger.info('📤 Submitting form...');
                await page.waitForTimeout(5000); // Wait for submission
                consecutiveNoAction = 0;
                // Loop will check for success on next iteration
            } else if (navigationResult === 'next_page') {
                this.logger.info('➡️ Moving to next page...');
                await page.waitForTimeout(2000);
                consecutiveNoAction = 0;
            } else if (navigationResult === 'no_action') {
                consecutiveNoAction++;
                if (fieldsToProcess.length === 0) {
                     this.logger.warn('⚠️ No actions available and no fields left to fill.');
                     if (consecutiveNoAction >= 2) {
                        const forceSubmit = await this.tryForceSubmit(page);
                        if (!forceSubmit) {
                            return { success: false, message: 'Stuck on page, no navigation found' };
                        }
                     }
                }
            }
        }

        return { success: false, message: 'Max steps reached without confirmed success' };
    }

    private detectSuccessParams(html: string): boolean {
        const lowerHtml = html.toLowerCase();
        return (
            lowerHtml.includes('application submitted') ||
            lowerHtml.includes('thank you for applying') ||
            (lowerHtml.includes('success') && lowerHtml.includes('received your application'))
        );
    }

    private async extractFormFields(page: Page): Promise<FormField[]> {
        return await page.evaluate(() => {
            const fields: any[] = [];

            function generateSelector(el: Element): string {
                if (el.id) return `#${CSS.escape(el.id)}`;
                if (el.getAttribute('name')) return `[name="${el.getAttribute('name')!.replace(/"/g, '\\"')}"]`;
                let path = el.tagName.toLowerCase();
                const parent = el.parentElement;
                if (parent) {
                    const children = Array.from(parent.children);
                    const index = children.indexOf(el);
                    path += `:nth-child(${index + 1})`;
                }
                return path; 
            }

            const inputs = document.querySelectorAll('input, textarea, select, button');

            inputs.forEach((el, index) => {
                const element = el as HTMLElement;
                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || element.hasAttribute('hidden')) return;

                const tagName = element.tagName.toLowerCase();
                const inputType = element.getAttribute('type') || 'text';
                const id = element.id || `field_${index}`;
                let label = '';
                
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl) label = labelEl.textContent?.trim() || '';
                }
                if (!label) label = element.getAttribute('aria-label') || '';
                if (!label && (element as HTMLInputElement).placeholder) label = (element as HTMLInputElement).placeholder;
                if (!label) {
                    const parentLabel = element.closest('label');
                    if (parentLabel) label = parentLabel.textContent?.trim() || '';
                }
                if (!label) {
                    const container = element.parentElement;
                    if (container && container.textContent) {
                         const text = container.textContent.replace(element.innerText || '', '').trim(); // simplistic
                         if (text.length > 0 && text.length < 100) label = text;
                    }
                }

                let value = '';
                if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') value = (element as HTMLInputElement).value;
                if (inputType === 'radio' || inputType === 'checkbox') value = (element as HTMLInputElement).checked ? 'true' : '';

                let standardizedType: any = 'text';
                if (tagName === 'select') standardizedType = 'select';
                else if (tagName === 'textarea') standardizedType = 'textarea';
                else if (inputType === 'radio') standardizedType = 'radio';
                else if (inputType === 'checkbox') standardizedType = 'checkbox';
                else if (inputType === 'file') standardizedType = 'file';
                else if (inputType === 'submit' || tagName === 'button') standardizedType = 'button';
                else if (inputType === 'email' || inputType === 'tel' || inputType === 'number' || inputType === 'date') standardizedType = inputType;

                let options: string[] = [];
                if (standardizedType === 'select') {
                    options = Array.from((element as HTMLSelectElement).options).map(o => o.text);
                }

                fields.push({
                    id: id,
                    uniqueSelector: generateSelector(element),
                    type: standardizedType,
                    label: (label || id).substring(0, 100).replace(/\s+/g, ' ').trim(),
                    value: value,
                    required: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
                    options: options,
                    isVisible: true
                });
            });

            return fields;
        });
    }

    private async generateAnswersForFields(
        fields: FormField[], 
        context: AutomationContext
    ): Promise<Record<string, string>> {
        const questions = fields.map(f => ({
            id: f.id,
            label: `${f.label} ${f.options && f.options.length ? `[Options: ${f.options.join(', ')}]` : ''}`,
            type: f.type
        }));

        this.logger.info('🧠 Querying LLM for answers...');
        return await this.llmService.answerApplicationQuestions(
            questions,
            context.userProfile,
            context.resumeText,
            'Job application form'
        );
    }

    private async fillField(page: Page, field: FormField, answer: string, context: AutomationContext): Promise<boolean> {
        if (!answer && field.type !== 'file') return false;
        const selector = field.uniqueSelector;
        
        try {
            switch (field.type) {
                case 'text':
                case 'email':
                case 'tel':
                case 'number':
                case 'date':
                case 'textarea':
                    await page.fill(selector, answer);
                    return true;
                case 'select':
                    try {
                         await page.selectOption(selector, { label: answer });
                         return true;
                    } catch (e) {
                         if (field.options) {
                             const bestMatch = field.options.find(o => o.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(o.toLowerCase()));
                             if (bestMatch) {
                                 await page.selectOption(selector, { label: bestMatch });
                                 return true;
                             }
                         }
                    }
                    break;
                case 'checkbox':
                    if (answer.toLowerCase() === 'true' || answer.toLowerCase() === 'yes') {
                        await page.check(selector);
                        return true;
                    } else if (answer.toLowerCase() === 'false' || answer.toLowerCase() === 'no') {
                        await page.uncheck(selector);
                        return true;
                    }
                    break;
                case 'radio':
                    if (field.label.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(field.label.toLowerCase())) {
                        await page.check(selector);
                        return true;
                    }
                    break;
                case 'file':
                    if (context.resumePath) {
                        await page.setInputFiles(selector, context.resumePath);
                        return true;
                    }
                    break;
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to fill field ${field.id}: ${msg}`);
        }
        return false;
    }

    private async handleNavigation(page: Page): Promise<'submitting' | 'next_page' | 'no_action'> {
        return await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a[role="button"]'));
            const visibleButtons = buttons.filter((b: any) => {
                 const style = window.getComputedStyle(b);
                 return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            });
            
            let submitBtn: HTMLElement | null = null;
            let nextBtn: HTMLElement | null = null;
            
            for (const btn of visibleButtons) {
                const element = btn as HTMLElement;
                const text = (element.innerText || (element as HTMLInputElement).value || '').toLowerCase();
                
                if (text.match(/submit|apply|finish|send application/i)) {
                    submitBtn = element;
                    break;
                } else if (text.match(/next|continue|proceed|step/i)) {
                    nextBtn = element;
                }
            }
            
            if (submitBtn) {
                submitBtn.click();
                return 'submitting';
            }
            if (nextBtn) {
                nextBtn.click();
                return 'next_page';
            }
            return 'no_action';
        });
    }

    private async tryForceSubmit(page: Page): Promise<boolean> {
        const submitSelector = 'button[type="submit"], input[type="submit"]';
        if (await page.$(submitSelector)) {
            await page.click(submitSelector);
            return true;
        }
        return false;
    }
}
