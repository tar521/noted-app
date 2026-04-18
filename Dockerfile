# ─── Stage 1: Build the Vite frontend ───────────────────────────────────────
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .

# Bake the backend URL in at build time
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build
# Output lands in /app/frontend/dist

# ─── Stage 2: Backend + serve frontend ───────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/ .

# Copy built frontend into a folder the backend can serve statically
COPY --from=frontend-build /app/frontend/dist ./public

# Persist data (SQLite, flat files, etc.)
VOLUME ["/app/data"]

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "server.js"]