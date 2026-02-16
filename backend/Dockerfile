# Use official Playwright image with Chromium only (smaller, faster)
# Version matches package.json: playwright@1.40.1
FROM mcr.microsoft.com/playwright:v1.40.1-jammy-chromium

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Create directories for file uploads
RUN mkdir -p resumes screenshots uploads/resumes

# Expose backend port
EXPOSE 3000

# Start development server with hot reload
CMD ["npm", "run", "start:dev"]
