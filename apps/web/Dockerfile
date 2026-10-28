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

RUN turbo prune web --docker

FROM base AS dependencies

COPY --from=pruner /workspace/out/json/ ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
	pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder

COPY --from=dependencies /workspace /workspace
COPY --from=pruner /workspace/out/full/ ./

ARG VITE_SERVER_URL=http://localhost:3000
ARG SERVER_URL=http://server:3000

ENV NODE_ENV=production
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV SERVER_URL=$SERVER_URL

RUN pnpm --filter web env:generate && pnpm --filter web build

FROM node:24-alpine AS runner

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app

COPY --from=builder --chown=node:node /workspace/apps/web/.output ./.output

USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
	CMD node -e "fetch('http://127.0.0.1:3001/').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
