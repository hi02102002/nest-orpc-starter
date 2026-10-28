# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable \
	&& corepack prepare pnpm@11.9.0 --activate \
	&& npm install --global turbo@2.11.10

WORKDIR /workspace

FROM base AS pruner

COPY . .

RUN turbo prune server --docker

FROM base AS dependencies

COPY --from=pruner /workspace/out/json/ ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
	pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder

COPY --from=dependencies /workspace /workspace
COPY --from=pruner /workspace/out/full/ ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
	pnpm --filter server env:generate \
	&& pnpm --filter server build \
	&& pnpm --filter server deploy --prod --legacy --ignore-scripts /server

FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=builder --chown=node:node /server ./
COPY --from=builder --chown=node:node /workspace/apps/server/dist ./dist
COPY --from=builder --chown=node:node /workspace/apps/server/.env.schema ./.env.schema

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
	CMD node -e "fetch('http://127.0.0.1:3000/').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "dist/main.mjs"]
