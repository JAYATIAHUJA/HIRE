import { BadRequestException } from '@nestjs/common';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

export class FileValidator {
  private static readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB default

  private static readonly MAGIC_NUMBERS = {
    pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
    docx: [0x50, 0x4B, 0x03, 0x04], // PK.. (ZIP)
    doc: [0xD0, 0xCF, 0x11, 0xE0], // CFBF (OLE)
  };

  /**
   * Validates a file buffer against size and magic numbers
   */
  static validate(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options: FileValidationOptions = {},
  ): void {
    const maxSize = options.maxSize || this.MAX_SIZE;

    // 1. Size Validation
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
      );
    }

    // 2. Extension Validation
    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt'];
    if (!allowedExts.includes(ext)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.',
      );
    }

    // 3. Magic Number Validation
    this.validateMagicNumber(buffer, ext);
  }

  private static validateMagicNumber(buffer: Buffer, ext: string): void {
    const header = buffer.subarray(0, 4);
    let isValid = false;

    switch (ext) {
      case '.pdf':
        isValid = this.compareHeader(header, this.MAGIC_NUMBERS.pdf);
        break;
      case '.docx':
        isValid = this.compareHeader(header, this.MAGIC_NUMBERS.docx);
        break;
      case '.doc':
        isValid = this.compareHeader(header, this.MAGIC_NUMBERS.doc);
        break;
      case '.txt': {
        // Text files don't have magic numbers, but shouldn't have binary headers
        // Just ensure it's not one of the other formats disguised
        const isPdf = this.compareHeader(header, this.MAGIC_NUMBERS.pdf);
        const isZip = this.compareHeader(header, this.MAGIC_NUMBERS.docx);
        const isDoc = this.compareHeader(header, this.MAGIC_NUMBERS.doc);
        
        if (isPdf || isZip || isDoc) {
             throw new BadRequestException('File content does not match extension .txt');
        }
        isValid = true;
        break;
      }
      default:
        isValid = false;
    }

    if (!isValid) {
      throw new BadRequestException(
        `File content does not match extension ${ext}`,
      );
    }
  }

  private static compareHeader(buffer: Buffer, magic: number[]): boolean {
    if (buffer.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) return false;
    }
    return true;
  }
}
