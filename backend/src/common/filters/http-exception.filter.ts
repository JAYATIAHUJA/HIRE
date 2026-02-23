import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

/**
 * Global exception filter that sanitizes error responses in production.
 * Prevents leakage of internal error messages, stack traces, and sensitive details.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Get the error response
    let errorResponse: unknown;
    if (exception instanceof HttpException) {
      errorResponse = exception.getResponse();
    }

    // Extract error message safely
    let errorMessage: string;
    if (typeof errorResponse === 'string') {
      errorMessage = errorResponse;
    } else if (typeof errorResponse === 'object' && errorResponse !== null) {
      const responseObj = errorResponse as Record<string, unknown>;
      if (typeof responseObj.message === 'string') {
        errorMessage = responseObj.message;
      } else if (Array.isArray(responseObj.message)) {
        errorMessage = responseObj.message.join(', ');
      } else {
        errorMessage = 'An error occurred';
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
    } else {
      errorMessage = 'Internal server error';
    }

    // Log the full error for debugging (server-side only)
    this.logger.error(
      `Exception caught: ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Build response based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';

    const responsePayload: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // In development, include detailed error info
    // In production, hide internal details
    if (isDevelopment) {
      responsePayload.error = errorMessage;
      if (exception instanceof Error && exception.stack) {
        responsePayload.stack = exception.stack;
      }
    } else {
      // Production: Only show generic messages for client errors
      // For 5xx errors, always use generic message
      if (status >= 500) {
        responsePayload.error = 'Internal server error';
      } else if (status === 401) {
        responsePayload.error = 'Unauthorized';
      } else if (status === 403) {
        responsePayload.error = 'Forbidden';
      } else if (status === 404) {
        responsePayload.error = 'Not found';
      } else {
        // For other 4xx errors, the message is usually safe to show
        // (validation errors, bad request, etc.)
        responsePayload.error = errorMessage;
      }
    }

    return response.status(status).send(responsePayload);
  }
}