import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { UsersService } from './users.service';
import { ResumeParserService } from '../services/resume-parser.service';
import { IsString, IsEmail, IsArray, IsNotEmpty, IsOptional } from 'class-validator';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types for resume uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  masterResumeText: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsOptional()
  @IsString()
  phone?: string;
}

class UpdateResumeDto {
  @IsString()
  @IsNotEmpty()
  masterResumeText: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}

@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly resumeParserService: ResumeParserService,
  ) { }

  /**
   * Create or update user with text resume
   */
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      skills: user.skills,
      message: 'User created successfully',
    };
  }

  /**
   * Legacy seed-user endpoint
   */
  @Post('/seed')
  async seedUser(@Body() createUserDto: CreateUserDto) {
    return this.createUser(createUserDto);
  }

  /**
   * Upload resume file (PDF/DOCX/DOC/TXT) via multipart/form-data
   * 
   * Uses Fastify's native multipart support for efficient file streaming.
   * File size limit: 5MB
   * Allowed types: PDF, DOC, DOCX, TXT
   * 
   * Example request (multipart/form-data):
   * - file: <binary file data>
   */
  @Post(':id/upload-resume')
  @HttpCode(HttpStatus.OK)
  async uploadResume(
    @Param('id') userId: string,
    @Req() request: FastifyRequest,
  ) {
    // Find user first
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get the file from multipart - the file() method is added by @fastify/multipart
    const file = await (request as any).file();
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed'
      );
    }

    // Read file buffer with size limit
    const buffer = await file.toBuffer();
    
    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }

    // Extract filename
    const filename = file.filename || 'resume.pdf';

    // Parse resume using the buffer directly (no Base64 decoding needed)
    const parsedResume = await this.resumeParserService.parseResume({
      buffer,
      originalname: filename,
      mimetype: file.mimetype,
    });

    // Save resume file
    const resumeFileUrl = await this.resumeParserService.saveResumeFile(userId, {
      buffer,
      originalname: filename,
    });

    // Update user with parsed resume text and extracted skills
    const mergedSkills = [...new Set([
      ...(user.skills || []),
      ...parsedResume.extractedSkills,
    ])];

    await this.usersService.updateResume(userId, {
      masterResumeText: parsedResume.text,
      skills: mergedSkills,
      resumeFileUrl,
      phone: parsedResume.extractedPhone,
    });

    return {
      message: 'Resume uploaded and parsed successfully',
      fileName: filename,
      fileUrl: resumeFileUrl,
      extractedSkills: parsedResume.extractedSkills,
      extractedEmail: parsedResume.extractedEmail,
      extractedPhone: parsedResume.extractedPhone,
      extractedName: parsedResume.extractedName,
      textLength: parsedResume.text.length,
    };
  }

  /**
   * Update resume text directly
   */
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async updateResume(
    @Param('id') userId: string,
    @Body() updateDto: UpdateResumeDto,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.usersService.updateResume(userId, {
      masterResumeText: updateDto.masterResumeText,
      skills: updateDto.skills || user.skills,
    });

    return {
      message: 'Resume updated successfully',
    };
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      skills: user.skills,
      phone: user.phone,
      hasResume: !!user.masterResumeText,
      resumeFileUrl: user.resumeFileUrl,
    };
  }

  /**
   * Get user by email
   */
  @Get('by-email/:email')
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      skills: user.skills,
    };
  }
}
