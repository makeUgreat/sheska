# E2E 테스트 런타임 전용임. 프로덕션은 Cloudflare Pages가 vite build 결과를 정적으로 서빙함.
# VITE_API_BASE_URL 없이 빌드해 /api fallback을 쓰고, vite preview가 API_BASE_URL로 /api를 프록시함.
FROM node:24.22.1-alpine

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/ui/package.json ./apps/ui/
COPY packages/contract/package.json packages/contract/tsconfig.json ./packages/contract/
COPY packages/contract/src ./packages/contract/src

RUN pnpm install --frozen-lockfile --filter @sheska/ui...

COPY apps/ui/index.html ./apps/ui/
COPY apps/ui/src ./apps/ui/src
COPY apps/ui/tsconfig.json apps/ui/vite.config.ts ./apps/ui/

RUN pnpm --filter @sheska/ui build

WORKDIR /app/apps/ui

EXPOSE 4173

CMD ["pnpm", "vite", "preview", "--host", "--port", "4173"]
