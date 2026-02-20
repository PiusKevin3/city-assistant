# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable

WORKDIR /app

# Copy lockfile and package.json first (for better caching)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy rest of the app
COPY . .

# Build Vite app
RUN pnpm build


# ---------- Stage 2: Production ----------
FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config to listen on both 80 and 8080
RUN echo 'server { \
    listen 80; \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose both ports
EXPOSE 80 8080

CMD ["nginx", "-g", "daemon off;"]