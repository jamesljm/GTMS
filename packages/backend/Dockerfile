FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile || pnpm install

# Build shared
FROM deps AS build-shared
WORKDIR /app
COPY packages/shared/ ./packages/shared/
RUN pnpm --filter shared build

# Build backend
FROM build-shared AS build
WORKDIR /app
COPY packages/backend/ ./packages/backend/
RUN cd packages/backend && npx prisma generate

# Production
FROM base AS runner
WORKDIR /app

# Copy everything needed
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/backend ./packages/backend
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/packages/backend

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx src/index.ts"]
