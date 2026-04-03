FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile || pnpm install

# Build shared
FROM deps AS build-shared
WORKDIR /app
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter shared build

# Build frontend
FROM build-shared AS build
WORKDIR /app
COPY packages/frontend/ ./packages/frontend/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm --filter frontend build

# Production
FROM base AS runner
WORKDIR /app/packages/frontend

ENV NODE_ENV=production

COPY --from=build /app/packages/frontend/.next/standalone ./
COPY --from=build /app/packages/frontend/.next/static ./packages/frontend/.next/static
COPY --from=build /app/packages/frontend/public ./packages/frontend/public

EXPOSE 3000

CMD ["node", "packages/frontend/server.js"]
