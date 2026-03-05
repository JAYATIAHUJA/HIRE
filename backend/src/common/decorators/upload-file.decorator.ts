import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export const UploadFile = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const file = await req.file();
    
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    return file;
  },
);
