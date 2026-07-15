FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/ui/package.json ./apps/ui/

RUN pnpm install --frozen-lockfile --filter @sheska/ui

COPY apps/ui/index.html ./apps/ui/
COPY apps/ui/src ./apps/ui/src
COPY apps/ui/tsconfig.json apps/ui/vite.config.ts ./apps/ui/

RUN pnpm --filter @sheska/ui build

WORKDIR /app/apps/ui

EXPOSE 4173

CMD ["pnpm", "vite", "preview", "--host", "--port", "4173"]
