# Stage 1: Build the React frontend
FROM node:23-alpine3.21 AS client-builder
WORKDIR /app
# Copy root package.json first for better caching
COPY package*.json ./
# Install dependencies at root and frontend
RUN npm ci
# Copy all project files
COPY . .
# Build frontend and backend
RUN npm run build

# Stage 2: Build the backend and run the full application
FROM node:23-alpine3.21 AS runner
WORKDIR /app

# Create directory structure
RUN mkdir -p /app/attachments

# Copy backend dependencies and install
COPY package*.json ./
RUN npm ci --ignore-scripts --prefer-offline --no-audit --no-fund

# Copy backend code and built frontend
COPY --from=client-builder /app/build ./build


# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"]
