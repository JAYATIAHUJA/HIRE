import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ResumeParserService } from '../services/resume-parser.service';
import { IsString, IsEmail, IsArray, IsNotEmpty, IsOptional } from 'class-validator';
import { FastifyRequest } from 'fastify';

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

// Deprecated: Use multipart upload instead
// class UploadResumeDto { ... }

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
   * Upload resume file (PDF/DOCX/DOC/TXT) as base64
   * 
   * Example request:
   * {
   *   "fileContent": "JVBERi0xLjQK...", // Base64 encoded file
   *   "fileName": "resume.pdf",
   *   "mimeType": "application/pdf"
   * }
   */
  @Post(':id/upload-resume')
  @HttpCode(HttpStatus.OK)
  async uploadResume(Multipart/Form-Data
   */
  @Post(':id/upload-resume')
  @HttpCode(HttpStatus.OK)
  async uploadResume(
    @Param('id') userId: string,
    @Req() req: FastifyRequest,
  ) {
    // Check if multipart
    if (!req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data');
    }

    const file = await req.file();
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    // Check magic numbers or extension if mimetype is generic application/octet-stream? 
    // For now rely on Fastify's detected mimetype
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, DOCX, and TXT files are allowed');
    }

    // Find user
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Convert stream to buffer
    const buffer = await file.toBuffer();

    // Parse resume
    const parsedResume = await this.resumeParserService.parseResume({
      buffer,
      originalname: file.filename,
      mimetype: file.mimetype,
    });

    // Save resume file
    const resumeFileUrl = await this.resumeParserService.saveResumeFile(userId, {
      buffer,
      originalname: file.filename,
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
      fileName: file.fileny
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
   * Get all users (paginated)
   */
  @Get()
  async getAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);

    const pageNumber = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
    const limitNumber = isNaN(parsedLimit) ? 10 : Math.max(1, parsedLimit);

    const validLimit = limitNumber > 100 ? 100 : limitNumber;

    const { data, total } = await this.usersService.findAll(pageNumber, validLimit);

    return {
      data: data.map(user => ({
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        skills: user.skills,
      })),
      meta: {
        total,
        page: pageNumber,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      }
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
