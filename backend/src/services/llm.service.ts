import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class LlmService {
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private provider: string;

  constructor(@InjectPinoLogger(LlmService.name) private readonly logger: PinoLogger) {
    logger.setContext(LlmService.name);
    this.provider = process.env.LLM_PROVIDER || 'openai';

    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else if (this.provider === 'gemini' && process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (retries > 0 && (error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota exceeded'))) {
        this.logger.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.withRetry(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      return await this.withRetry(async () => {
        if (this.provider === 'openai' && this.openai) {
          const response = await this.openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
            input: text,
          });
          return response.data[0].embedding;
        } else if (this.provider === 'gemini' && this.gemini) {
          try {
            // Try the latest first
            const model = this.gemini.getGenerativeModel({ model: 'text-embedding-004' });
            const result = await model.embedContent(text);
            return result.embedding.values;
          } catch (e) {
            // Fallback to older model
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.warn(`Failed to use text-embedding-004, trying embedding-001: ${msg}`);
            const model = this.gemini.getGenerativeModel({ model: 'embedding-001' });
            const result = await model.embedContent(text);
            return result.embedding.values;
          }
        }
        throw new Error('No LLM provider configured');
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating embedding: ${msg}`);
      throw error;
    }
  }


  async extractRequirements(jobDescription: string): Promise<string[]> {
    const prompt = `Extract the key skills, technologies, and requirements from this job description. Return only a JSON array of strings, no other text.

Job Description:
${jobDescription}

Return format: ["skill1", "skill2", "skill3"]`;

    try {
      return await this.withRetry(async () => {
        if (this.provider === 'openai' && this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that extracts job requirements. Always return valid JSON arrays only.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
          });

          const content = response.choices[0].message.content;
          const cleaned = content?.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned || '[]');
        } else if (this.provider === 'gemini' && this.gemini) {
          // Fallback to gemini-pro if flash fails, or just use gemini-pro
          const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'; 
          const model = this.gemini.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const response = result.response.text();
          const cleaned = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned || '[]');
        }
        throw new Error('No LLM provider configured');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error extracting requirements: ${errorMessage}`);
      // Fallback: return empty array
      return [];
    }
  }

  async tailorResume(
    masterResume: string,
    jobDescription: string,
    requirements: string[],
  ): Promise<string> {
    const prompt = `You are an expert resume writer specializing in ATS (Applicant Tracking System) optimization.

Given the user's master resume and a job description, create a tailored resume that:
1. Highlights relevant skills and experiences from the master resume
2. Uses keywords from the job requirements
3. Maintains truthfulness (only include what's in the master resume)
4. Is formatted for ATS systems (plain text, clear sections)

Master Resume:
${masterResume}

Job Description:
${jobDescription}

Key Requirements:
${requirements.join(', ')}

Return the tailored resume as plain text, optimized for this specific job.`;

    try {
      return await this.withRetry(async () => {
        if (this.provider === 'openai' && this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are an expert resume writer. Return only the tailored resume text, no explanations.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
          });

          return response.choices[0].message.content || masterResume;
        } else if (this.provider === 'gemini' && this.gemini) {
          const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
          const result = await model.generateContent(prompt);
          return result.response.text();
        }
        throw new Error('No LLM provider configured');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error tailoring resume: ${errorMessage}`);
      // Fallback: return original resume
      return masterResume;
    }
  }

  async answerApplicationQuestions(
    questions: { id: string; label: string; type: string }[],
    userProfile: any,
    resumeText: string,
    jobDescription?: string,
  ): Promise<Record<string, string>> {
    const prompt = `
You are a smart job application assistant.
Your task is to generate answers for the following job application form fields based on the user's profile and resume.

User Profile: ${JSON.stringify(userProfile)}
Resume Summary: ${resumeText.substring(0, 3000)}...
Job Description Context: ${jobDescription ? jobDescription.substring(0, 1000) : 'Not provided'}

Form Fields to Fill:
${JSON.stringify(questions, null, 2)}

Instructions:
1. For each field, provide the exact text to fill.
2. If the field is a "cover_letter" or "why_hired", write a compelling, professional, and personalized paragraph (3-5 sentences) connecting the user's skills to the job.
3. If asking for "Current Verification" or "Location", use the user's location.
4. If asking for "Availability", answer "Immediately" or "As per notice period" (assume immediately if not specified).
5. For numeric fields (experience, salary), provide just the number or range.
6. Return ONLY a JSON object mapping 'id' to 'answer'.
Example format: { "field_id_1": "Answer text", "field_id_2": "12" }
`;

    try {
      return await this.withRetry(async () => {
        let responseText = '';
        if (this.provider === 'openai' && this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{ role: 'system', content: 'You are a helpful assistant. Return generic JSON only.' }, { role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          });
          responseText = response.choices[0].message.content || '{}';
        } else if (this.provider === 'gemini' && this.gemini) {
          // Gemini handling
          const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { responseMimeType: "application/json" } as any });
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
        } else {
          // Fallback for OpenAI Compatible (Groq) via OpenAI SDK if configured as 'openai' but pointing to Groq
          // Assuming existing OpenAI fallback works if ENV vars are set for Groq
          throw new Error('LLM Provider not configured for generic chat');
        }

        // Clean and parse
        const cleaned = responseText.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error answering questions: ${errorMessage}`);
      // Fallback: simple mapping
      const fallback: Record<string, string> = {};
      questions.forEach(q => {
        if (q.label.toLowerCase().includes('name')) fallback[q.id] = userProfile.name;
        else if (q.label.toLowerCase().includes('email')) fallback[q.id] = userProfile.email;
        else fallback[q.id] = "Please refer to my resume.";
      });
      return fallback;
    }
  }

  async extractJobDetailsFromText(text: string, url: string): Promise<any> {
    const prompt = `You are a job extraction agent. Extract structured job details from the following raw web page text.
    
    Url: ${url}
    
    Raw Text:
    ${text.substring(0, 15000)} ... (truncated)
    
    Return a Strict JSON object with these fields:
    - title (string): Job title
    - company (string): Company name
    - location (string): Location
    - description (string): Full job description text
    - requirements (array of strings): Key skills/requirements
    - employmentType (string): "full-time", "part-time", "contract", "internship", etc.
    - postedAt (string or null): Date posted if found
    - salary (string or null): Salary range if found
    
    If you cannot find a valid job posting in the text, return null. 
    Only return valid JSON, no markdown formatting.`;

    try {
      return await this.withRetry(async () => {
        let responseText = '';
        if (this.provider === 'openai' && this.openai) {
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are a precise data extraction agent. Return only valid JSON.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          });
          responseText = response.choices[0].message.content || '';
        } else if (this.provider === 'gemini' && this.gemini) {
          const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
          const model = this.gemini.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          responseText = result.response.text();
        } else {
          throw new Error('No LLM provider configured');
        }

        const cleaned = responseText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        if (cleaned.toLowerCase() === 'null') return null;
        return JSON.parse(cleaned);
      });
    } catch (error) {
      this.logger.error(`Error extracting job details via LLM: ${error.message}`);
      return null;
    }
  }
}



