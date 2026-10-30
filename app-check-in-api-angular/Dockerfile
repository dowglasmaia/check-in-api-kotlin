# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Unprivileged nginx serves the SPA and proxies the API (same origin, no CORS).
FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV API_UPSTREAM=http://api:8080
# Value served in /config.json; empty means "same origin".
ENV API_BASE_URL=""
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/app-check-in-api-angular/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
