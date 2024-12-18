# Use Node.js LTS slim image
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

# Install dependencies and global tools
RUN npm ci --only=production && \
    npm install -g typescript ts-node

# Bundle app source
COPY . .

# Create cache directory with proper permissions
RUN mkdir -p .cache && chown -R node:node .cache

# Build the application
RUN npm run build

# Install the CLI tool globally
RUN npm install -g .

# Install bash for better interactive experience
RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*

# Use node user instead of root
USER node

# Set production environment
ENV NODE_ENV=production

# Set up a working directory for the user
WORKDIR /home/node/app

# Remove ENTRYPOINT to allow for both interactive and non-interactive use
CMD ["/bin/bash", "-l"]