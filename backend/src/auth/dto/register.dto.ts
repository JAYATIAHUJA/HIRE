import { IsEmail, IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  masterResumeText: string;

  @IsArray()
  skills: string[];

  @IsOptional()
  @IsString()
  phone?: string;
}
