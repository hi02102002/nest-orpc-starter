# AGENTS.md

Guidance for coding agents working in this repository. Claude Code loads this file through `CLAUDE.md`.

## Stack

pnpm + Turborepo monorepo:

- `apps/server`: NestJS API with a contract-first oRPC layer, organized by feature (`src/features/<feature>`).
- `apps/web`: TanStack Start web app (Router, Query) using Ant Design and TailwindCSS.
- `packages/api-contract`: the shared oRPC contract. **Zod only**: it ships to the browser and must never import `@app/db` or `drizzle-orm`.
- `packages/crud`: generic typed CRUD layer (contract builder, server engine, client utils).
- `packages/db`: Drizzle ORM `1.0.0-rc` schema, relations (RQB v2) and migrations, on PostgreSQL.
- `packages/auth`: Better Auth configuration.
- `packages/cli`: the `generate:crud` scaffolder.
- `packages/config`: shared tsconfig.

## Commands

```bash
pnpm install
pnpm dev                       # web on :3333, API on :8080 (reference at /docs)
pnpm check-types               # all workspaces; builds api-contract and crud declarations first
pnpm exec biome check <paths>  # lint + format check; `pnpm check` writes fixes for the whole repo
pnpm --filter server check-types
pnpm --filter web check-types
pnpm --filter @app/db exec drizzle-kit generate --name <name>   # root `pnpm db:generate` needs a TTY (turbo interactive task)
pnpm db:up | pnpm db:down      # local Postgres from compose.dev.yaml (compose.yaml is production images only)
pnpm db:migrate | pnpm db:push | pnpm db:studio
pnpm db:seed-admin <email>     # promote an existing user to admin (needed to open /admin/users)
```

CI (`.github/workflows/ci.yml`) runs `biome ci .` and `pnpm check-types`. Run both before declaring work done.

## Skills

Project skills live in `.agents/skills/` (also exposed to Claude Code via `.claude/skills`). Load the matching one before editing:

| Task                                             | Skill                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Plain list/get/create/update/delete over a table | `app-crud` (and `packages/crud/README.md`)                                                                                      |
| A new or changed endpoint with business logic    | `orpc-api-contract` + `app-server`                                                                                              |
| Server modules, auth, logging, DB access         | `app-server`                                                                                                                    |
| Drizzle schema, relations, queries               | `drizzle-best-practices`                                                                                                        |
| Web routing, data loading, queries               | `tanstack-start`, `tanstack-router`, `tanstack-query`, `tanstack-integration`                                                   |
| UI components                                    | `antd`, `ant-design`                                                                                                            |
| Auth features                                    | `better-auth-*`, `email-and-password-best-practices`, `organization-best-practices`, `two-factor-authentication-best-practices` |

## Architecture rules

- **Contract first.** API shapes live in `packages/api-contract`. The server implements them with `@Implement(contract.x)` + `pub.x` / `authed.x` from `apps/server/src/lib/orpc/procedures.ts`. The web consumes them through `apps/web/src/utils/orpc.ts`. Never redeclare DTOs on the server or the web.
- **Plain CRUD goes through `orpc.crud`.** Add a resource to `packages/api-contract/src/crud.resources.ts`, bind its table in `apps/server/src/features/crud/crud.tables.ts`, and add a scope policy in `crud.policies.ts` when rows belong to a user. Don't write per-table controllers for plain CRUD.
- **Feature-based server.** One folder per capability under `apps/server/src/features/`, each with its own module, and every module imported by `AppModule`. Inside `src`, import with the `@/` alias; use `./` only within a folder.
- **Explicit DI tokens.** The dev server runs under `tsx`, which emits no decorator metadata. Inject with `@Inject(Token)` (for example `@Inject(CrudService)`, `@Inject(getDrizzleToken())`). Relying on bare constructor types leaves dependencies `undefined` in dev.
- **Authentication.** Read the session from `context.session` (resolved once in `lib/orpc/context.ts`). Don't parse cookies or call Better Auth from feature code.
- **Web code placement.** Code used by one route lives next to it in `_components/`, `_hooks/`, `_utils/` or `_types/` (for example `src/routes/_authed/admin/users/_hooks/`). `vite.config.ts` sets `routeFileIgnorePattern` so the router doesn't treat these folders as pathless routes; add any new folder name there. Once a second route needs the code, move it to `src/features/<feature>/{components,hooks,utils}`. Only app-wide pieces belong in `src/components`, `src/hooks` or `src/lib`.
- **Drizzle relations.** Define app relations with `defineRelationsPart` in `packages/db/src/relations.ts`. Never add a `user` key there: spreading it replaces `authRelations.user`.

## Conventions

- Biome: tabs, double quotes, kebab-case filenames, organized imports. Match the comment density of the surrounding code.
- TypeScript is strict with `noUncheckedIndexedAccess`. Don't silence errors with `any` or casts when a schema or type is actually wrong.
- Commits follow Conventional Commits, for example `feat(crud): ...`, `fix(server): ...`, `docs(skills): ...`.
- ⚠️ **Deploys are triggered by commit messages.** A push to `main` whose head commit message contains `deploy` (case-insensitive) builds and deploys once CI passes. Keep the word out of commit messages unless a deploy is intended.
- Don't commit secrets. Env schemas live in each app's `.env.schema`, and Varlock generates `src/env.ts`.

## Known gotchas

- **Migrations can't build a fresh database.** The tracked history starts with an `ALTER TABLE "user"` and has no migration that creates the auth tables. Use `pnpm db:push` for a brand-new database until the history is repaired.
- **Hard-loading an authed page redirects to `/login`.** `_authed` `beforeLoad` calls `authClient.getSession()` during SSR without forwarding cookies. Client-side navigation works.
- **OpenAPI.** Input schemas must be convertible to JSON Schema. Avoid bare `z.coerce.date()` in inputs and use `z.iso.datetime().pipe(z.coerce.date())` instead. Routes whose input is a union can't use path params.
