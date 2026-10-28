# nest-orpc-starter

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) and has since moved to a NestJS API with a contract-first oRPC layer, a TanStack Start web app, and a shared generic CRUD layer.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start / Router / Query** - SSR, file-based routing and data fetching with full type safety
- **Ant Design + TailwindCSS** - UI components and utility-first styling
- **NestJS** - Feature-based backend modules
- **oRPC** - Contract-first, end-to-end type-safe APIs with OpenAPI docs
- **Generic CRUD** - One typed oRPC router for every registered resource (`packages/crud`)
- **Node.js** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Start a local PostgreSQL with Docker (`compose.dev.yaml`), or use your own database:

```bash
pnpm db:up     # postgres:17 on localhost:5432, waits until healthy; `pnpm db:down` stops it
```

2. Update your `apps/server/.env` file with your PostgreSQL connection details. The Docker database matches `DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres`; override with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` or `POSTGRES_PORT`.

3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3333](http://localhost:3333) in your browser to see the web application.
The API is running at [http://localhost:8080](http://localhost:8080), with the API reference at [http://localhost:8080/docs](http://localhost:8080/docs).

## Docker

Both applications use multi-stage images. The API runs the bundled NestJS
server, while the web image runs the TanStack Start Nitro output. PostgreSQL is
external to this Compose stack.

Create the Docker environment file and update the database URL and auth secret:

```bash
cp .env.docker.example .env
```

Apply the database migrations against that external PostgreSQL database before
starting the applications:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app pnpm run db:migrate
```

Use the host-accessible database URL for this command. The example Docker env
uses `host.docker.internal` because the API resolves PostgreSQL from inside its
container.

Build and start both applications:

```bash
docker compose up --build
```

The web application is available at `http://localhost:3333`, the API at
`http://localhost:8080`, and the API reference at `http://localhost:8080/docs`.

`VITE_SERVER_URL` is embedded into the browser bundle during the web image
build. Rebuild the web image after changing this URL. TanStack Start uses the
internal Compose URL `http://server:8080` for SSR requests.

## API and CRUD

The API is contract-first: `packages/api-contract` holds the oRPC contract (zod only, shared with the web), `apps/server` implements it with NestJS, and the web consumes it through `orpc` utilities in `apps/web/src/utils/orpc.ts`.

There are two ways to add endpoints:

- **Plain CRUD over a table**: register a resource in the generic CRUD layer. No contract, controller or service is needed; the web calls `orpc.crud.*` with per-resource types, filters, sorting, search, pagination and joins.

  ```ts
  useQuery(orpc.crud.list.queryOptions({
  	input: { resource: "users", query: { search: "an", orderBy: { name: "asc" } } },
  }));
  ```

  Adding a resource touches four places: the Drizzle table and relations in `packages/db`, the zod registry in `packages/api-contract/src/crud.resources.ts`, the table binding in `apps/server/src/features/crud/crud.tables.ts`, and (for per-user data) a scope policy in `crud.policies.ts`. See [`packages/crud/README.md`](packages/crud/README.md) for the full guide, request lifecycle and troubleshooting.

- **Endpoints with business logic**: write a dedicated feature contract and NestJS feature module. `pnpm run generate:crud` scaffolds one (schema, contract, service, controller, module).

Agent skills for both workflows live in `.agents/skills` (`app-crud`, `orpc-api-contract`, `app-server`).

## UI

The web app uses Ant Design components with TailwindCSS utilities. The theme provider lives in `apps/web/src/components/antd-provider.tsx` and global styles in `apps/web/src/index.css`.

## Environment Configuration

Each app owns its environment schema in `.env.schema`. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Git Hooks and Formatting

- Run checks: `pnpm run check`

## Project Structure

```
nest-orpc-starter/
├── apps/
│   ├── web/           # Frontend application (TanStack Start + Ant Design)
│   └── server/        # Backend API (NestJS + oRPC), organized by feature
├── packages/
│   ├── api-contract/  # Shared oRPC contract and zod schemas (no DB imports)
│   ├── crud/          # Generic typed CRUD layer (contract, server engine, client utils)
│   ├── auth/          # Better Auth configuration
│   ├── db/            # Drizzle schema, relations & migrations
│   ├── cli/           # Code generators (`generate:crud`)
│   └── config/        # Shared TypeScript config
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run dev:web`: Start only the web application
- `pnpm run dev:server`: Start only the server
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate a migration from schema changes
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
- `pnpm run generate:crud`: Scaffold a dedicated feature (schema, contract, service, controller, module)
- `pnpm run check`: Run Biome formatting and linting

## Better Auth Schema Generation

After changing auth plugins or schema options, run `pnpm run auth:generate` from the project root. The script runs the Better Auth CLI through `varlock run` from the owning app directory, loading the auth instance from `src/services.ts`. Review the schema changes, then use your ORM's migration workflow to apply them.
