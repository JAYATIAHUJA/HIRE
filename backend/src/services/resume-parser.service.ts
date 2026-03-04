import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import * as fs from 'fs';
import * as path from 'path';

// PDF parsing
let pdfParse: any;
try {
    pdfParse = require('pdf-parse');
} catch (e) {
    console.warn('pdf-parse not installed');
}

// Word document parsing
let mammoth: any;
try {
    mammoth = require('mammoth');
} catch (e) {
    console.warn('mammoth not installed');
}

export interface ParsedResume {
    text: string;
    fileName: string;
    fileType: 'pdf' | 'docx' | 'doc' | 'txt';
    extractedSkills: string[];
    extractedEmail?: string;
    extractedPhone?: string;
    extractedName?: string;
}

@Injectable()
export class ResumeParserService {
    private readonly uploadDir = path.join(process.cwd(), 'uploads', 'resumes');

    constructor(@InjectPinoLogger(ResumeParserService.name) private readonly logger: PinoLogger) {
        logger.setContext(ResumeParserService.name);
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Parse resume from file buffer
     */
    async parseResume(file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    }): Promise<ParsedResume> {
        const ext = path.extname(file.originalname).toLowerCase();

        this.logger.info(`📄 Parsing resume: ${file.originalname} (${ext})`);

        let text = '';
        let fileType: ParsedResume['fileType'];

        switch (ext) {
            case '.pdf':
                text = await this.parsePdf(file.buffer);
                fileType = 'pdf';
                break;
            case '.docx':
                text = await this.parseDocx(file.buffer);
                fileType = 'docx';
                break;
            case '.doc':
                text = await this.parseDoc(file.buffer);
                fileType = 'doc';
                break;
            case '.txt':
                text = file.buffer.toString('utf-8');
                fileType = 'txt';
                break;
            default:
                throw new BadRequestException(`Unsupported file type: ${ext}. Supported: .pdf, .docx, .doc, .txt`);
        }

        // Clean up text
        text = this.cleanText(text);

        // Extract structured data
        const extractedSkills = this.extractSkills(text);
        const extractedEmail = this.extractEmail(text);
        const extractedPhone = this.extractPhone(text);
        const extractedName = this.extractName(text);

        this.logger.info(`✅ Parsed resume: ${text.length} chars, ${extractedSkills.length} skills detected`);

        return {
            text,
            fileName: file.originalname,
            fileType,
            extractedSkills,
            extractedEmail,
            extractedPhone,
            extractedName,
        };
    }

    /**
     * Save uploaded resume file
     */
    async saveResumeFile(userId: string, file: {
        buffer: Buffer;
        originalname: string;
    }): Promise<string> {
        const ext = path.extname(file.originalname);
        const fileName = `resume_${userId}_${Date.now()}${ext}`;
        const filePath = path.join(this.uploadDir, fileName);

        await fs.promises.writeFile(filePath, file.buffer);
        this.logger.info(`💾 Saved resume file: ${fileName}`);

        return `/uploads/resumes/${fileName}`;
    }

    /**
     * Parse PDF file
     */
    private async parsePdf(buffer: Buffer): Promise<string> {
        if (!pdfParse) {
            throw new BadRequestException('PDF parsing not available. Install pdf-parse package.');
        }

        try {
            const data = await pdfParse(buffer);
            return data.text || '';
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`PDF parsing error: ${errorMessage}`);
            throw new BadRequestException('Failed to parse PDF file. Make sure it is a valid PDF.');
        }
    }

    /**
     * Parse DOCX file (Word 2007+)
     */
    private async parseDocx(buffer: Buffer): Promise<string> {
        if (!mammoth) {
            throw new BadRequestException('DOCX parsing not available. Install mammoth package.');
        }

        try {
            const result = await mammoth.extractRawText({ buffer });
            return result.value || '';
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`DOCX parsing error: ${errorMessage}`);
            throw new BadRequestException('Failed to parse DOCX file. Make sure it is a valid Word document.');
        }
    }

    /**
     * Parse DOC file (older Word format)
     */
    private async parseDoc(buffer: Buffer): Promise<string> {
        // Mammoth also handles .doc files in many cases
        return this.parseDocx(buffer);
    }

    /**
     * Clean up extracted text
     */
    private cleanText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
            .replace(/\t+/g, ' ')
            .replace(/  +/g, ' ')
            .trim();
    }

    /**
     * Extract skills from resume text
     */
    private extractSkills(text: string): string[] {
        const skillPatterns = [
            // Programming languages
            /\b(python|javascript|typescript|java|c\+\+|c#|ruby|go|golang|rust|kotlin|swift|php|r|scala|perl)\b/gi,
            // Web technologies
            /\b(react|angular|vue|node\.js|nodejs|express|django|flask|spring|laravel|rails)\b/gi,
            // Databases
            /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|cassandra|oracle|sqlite)\b/gi,
            // Cloud & DevOps
            /\b(aws|azure|gcp|docker|kubernetes|jenkins|terraform|ansible|ci\/cd|devops)\b/gi,
            // Data Science
            /\b(machine learning|deep learning|tensorflow|pytorch|pandas|numpy|scikit-learn|nlp|data science)\b/gi,
            // Tools
            /\b(git|github|jira|confluence|figma|adobe|photoshop|illustrator)\b/gi,
            // Soft skills
            /\b(leadership|communication|teamwork|problem solving|analytical|project management)\b/gi,
        ];

        const foundSkills = new Set<string>();

        for (const pattern of skillPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(skill => {
                    foundSkills.add(skill.toLowerCase());
                });
            }
        }

        return Array.from(foundSkills);
    }

    /**
     * Extract email from text
     */
    private extractEmail(text: string): string | undefined {
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = text.match(emailPattern);
        return match ? match[0] : undefined;
    }

    /**
     * Extract phone from text
     */
    private extractPhone(text: string): string | undefined {
        // Various phone formats
        const phonePattern = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        const match = text.match(phonePattern);
        return match ? match[0] : undefined;
    }

    /**
     * Extract name (basic - first line or common name patterns)
     */
    private extractName(text: string): string | undefined {
        // Get first non-empty line as potential name
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            // If it looks like a name (2-4 words, no special chars except space)
            if (/^[A-Za-z\s]{2,50}$/.test(firstLine) && firstLine.split(/\s+/).length <= 4) {
                return firstLine;
            }
        }
        return undefined;
    }
}
