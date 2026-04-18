FROM node:20-slim

WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install --production

# Copy the rest of the code
COPY . .

# Create data directory for SQLite
RUN mkdir -p data

EXPOSE 3001

CMD ["node", "server.js"]
