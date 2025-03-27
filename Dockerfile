FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@10.7.0

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript code
RUN pnpm run build

# Remove dev dependencies
RUN pnpm prune --prod

# Expose the port the app runs on
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"] 