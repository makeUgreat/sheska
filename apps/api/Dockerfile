FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @sheska/api

COPY apps/api/src ./apps/api/src
COPY apps/api/database ./apps/api/database
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/tsconfig.migrate.json ./apps/api/

RUN pnpm --filter @sheska/api build

# Build migration scripts
RUN pnpm --filter @sheska/api exec tsc --project tsconfig.migrate.json
RUN cp -r apps/api/database/drizzle apps/api/dist/database/drizzle

RUN pnpm deploy --filter @sheska/api --prod /prod


FROM node:24-alpine AS production

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=build --chown=node:node /prod/node_modules ./node_modules
COPY --from=build --chown=node:node /prod/dist ./dist
COPY --from=build --chown=node:node /prod/package.json ./

USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["node", "dist/main"]