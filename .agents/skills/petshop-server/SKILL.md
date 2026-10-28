---
name: petshop-server
description: "Build, refactor, debug, and review the Petshop NestJS server in `apps/server`. Use this skill whenever a task changes a server feature, Nest module, controller, service, oRPC handler implementation, authentication/session access, database access, EVLog logging or observability, CORS, environment configuration, startup wiring, or server folder structure. Use it even for a small endpoint change so code stays feature-based and aligned with the shared oRPC contract."
---

# Petshop Server

Work in `apps/server` using NestJS feature modules and the repository's contract-first oRPC architecture. Keep transport wiring thin, organize behavior by feature, and preserve the boundary between shared infrastructure and feature code.

For changes to the public API shape, also use the `orpc-api-contract` skill. This skill owns the server implementation and folder structure; `orpc-api-contract` owns input/output schemas, routes, and typed API errors.

## Server structure

Keep the server organized like this:

```text
apps/server/
├── evlog.config.ts
└── src/
    ├── features/
    │   └── <feature>/
    │       ├── <feature>.module.ts
    │       ├── <feature>.controller.ts
    │       ├── <feature>.service.ts       # when business logic exists
    │       └── <feature>.repository.ts    # only when data access warrants it
    ├── app.module.ts
    ├── main.ts
    ├── orpc-context.ts
    ├── services.ts
    └── env.server.ts
```

Create one directory per business capability, not per technical layer. For example, use `features/pets` and `features/orders`; do not create global `controllers`, `services`, or `repositories` directories.

Keep a file feature-local until another feature genuinely needs it. Promote shared code only after a real second consumer appears; premature `common` folders hide ownership.

## Feature modules

Every feature owns a Nest module that registers its controllers and providers:

```ts
import { Module } from "@nestjs/common";

import { PetsController } from "./pets.controller";
import { PetsService } from "./pets.service";

@Module({
	controllers: [PetsController],
	providers: [PetsService],
})
export class PetsModule {}
```

Import feature modules from `app.module.ts`. Keep `AppModule` focused on application-wide infrastructure such as `ORPCModule.forRoot(...)` plus feature imports. Do not register feature controllers directly in `AppModule`.

Avoid barrel files unless they simplify a real external import surface. Direct imports make feature ownership and dependency direction clearer in this small server.

## Controllers and oRPC handlers

Controllers adapt the transport to feature logic. For an oRPC procedure, the decorator and implementer must reference the exact same contract node:

```ts
@Controller()
export class PetsController {
	constructor(private readonly petsService: PetsService) {}

	@Implement(contract.pets.get)
	getPet() {
		return implement(contract.pets.get).handler(async ({ input, errors }) => {
			const pet = await this.petsService.findById(input.id);

			if (!pet) {
				throw errors.NOT_FOUND();
			}

			return pet;
		});
	}
}
```

Apply these rules:

- Keep request validation, output schemas, routes, and typed error declarations in `@petshop/api-contract`; do not redeclare DTOs in the server.
- Use `@Implement(contract.x)` and `implement(contract.x)` with the same node so TypeScript catches drift.
- Keep small mapping and authorization checks in the handler, but move reusable business logic and database operations into a feature service.
- Return only the public output shape. Do not return raw database rows when they contain internal fields.
- Throw declared errors through `errors.CODE()`. Do not replace expected business failures with generic exceptions.
- Keep normal Nest routes such as `@Get()` inside the feature that owns them.

When a controller grows beyond a coherent feature boundary, split the feature by capability rather than creating a generic `ApiController`.

## Services and data access

Create `<feature>.service.ts` once a handler performs business rules, database queries, multiple operations, or logic reused by more than one procedure. Inject the service through the controller constructor and register it in the feature module.

Use the database from the established server infrastructure. Follow nearby code before introducing a new provider abstraction. If direct global imports become difficult to test or multiple implementations are required, introduce a Nest provider deliberately rather than wrapping every dependency by default.

Create a repository only when it provides a meaningful feature-level data access boundary. A repository that merely renames one database call adds indirection without value.

Keep transaction boundaries around the complete business operation, usually in the service that coordinates it.

## Authentication and request context

`orpc-context.ts` is the request-scoped boundary for shared oRPC context. It currently provides:

- `db`: the configured database instance.
- `session`: the Better Auth session or `null`.

Read authentication state through `context.session` in oRPC handlers:

```ts
if (!context.session?.user) {
	throw errors.UNAUTHORIZED();
}
```

Declare `UNAUTHORIZED` in the shared contract before throwing it. Do not parse cookies or call Better Auth separately inside each feature.

Keep Better Auth's `/api/auth` Node handler in `main.ts`. Preserve `credentials: true` and the configured CORS origin because the web client uses cookie authentication.

Do not put secrets, tokens, raw cookies, or internal exception details in API error messages or logs.

## EVLog observability

Use the NestJS integration as the application-wide logging boundary:

```ts
// app.module.ts
import { toMiddlewareOptions } from "evlog";
import { EvlogModule } from "evlog/nestjs";

import evlogConfig from "../evlog.config";

@Module({
	imports: [
		EvlogModule.forRoot(toMiddlewareOptions(evlogConfig)),
	],
})
export class AppModule {}
```

Initialize the logger before Nest creates the application:

```ts
// main.ts
import { initLogger, toLoggerConfig } from "evlog";

import evlogConfig from "../evlog.config";

initLogger(toLoggerConfig(evlogConfig));
```

Keep EVLog options in `evlog.config.ts` using `defineEvlog({ service: "petshop-server" })`. Put sampling, drains, enrichers, route filters, and retention rules in that config rather than scattering them across features.

The Nest middleware creates one request-scoped wide event. Add feature context progressively from controllers and services with `useLogger()` from `evlog/nestjs`:

```ts
import { useLogger } from "evlog/nestjs";

const log = useLogger();
log.set({ pet: { id } });
```

Log identifiers, counts, state transitions, timings, and safe business context that help explain the request. Avoid logging full request bodies, credentials, session cookies, access tokens, or sensitive customer fields.

When an oRPC error is already handled inside the oRPC pipeline, attach it to the current wide event from the existing `onError(...)` interceptor with `useLogger().error(error)` rather than emitting an unrelated `console.error`. Keep typed wire errors defined by the shared contract; observability must not change the API response shape.

This repository uses oRPC v2 through `@orpc/nest`. The current EVLog oRPC guide states that `withEvlog()` and the `evlog()` procedure middleware are the integration path for oRPC v1 while first-party v2 support is pending. Do not add those wrappers to this server without first verifying that the installed oRPC and EVLog versions explicitly support the NestJS v2 setup. Nest's EVLog middleware plus `useLogger()` is the safe integration here.

Use `log.fork(label, fn)` for background work that must emit a separate child wide event. Do not continue mutating the completed request event after the response has been emitted.

### Better Auth identity

Use `evlog/better-auth` to associate authenticated requests with safe user and session fields. Verify the installed Better Auth version first; EVLog documents compatibility with Better Auth `>=1.6.9`.

This server already resolves the Better Auth session in `orpc-context.ts`. Reuse that session with `identifyUser(...)` instead of adding `createAuthMiddleware(auth)` to the same oRPC request and resolving the session twice:

```ts
import { identifyUser } from "evlog/better-auth";
import { useLogger } from "evlog/nestjs";

const session = await auth.api.getSession({
	headers: fromNodeHeaders(request.headers),
});

if (session) {
	identifyUser(useLogger(), session);
}

return { db, session };
```

This keeps authentication, oRPC context, and log identity based on the same session result. It also preserves the existing `session: Session | null` handler contract.

Use `createAuthMiddleware(auth)` only for Nest routes that need automatic identity but do not already resolve a session. Exclude `/api/auth/**`, ensure the EVLog request scope runs before the identity middleware, and avoid applying both approaches to the same route:

```ts
const identify = createAuthMiddleware(auth, {
	exclude: ["/api/auth/**"],
});
```

EVLog extracts a whitelist rather than passwords or tokens, but identified events still contain personal data. Send only the fields required by the logging policy, mask email addresses when full values are unnecessary, restrict drain access, and align retention with the application's privacy requirements.

Do not manually log raw session objects. Never log cookies, session tokens, passwords, secrets, OAuth tokens, or complete request headers.

References:

- `https://www.evlog.dev/integrate/frameworks/nestjs`
- `https://www.evlog.dev/integrate/frameworks/orpc`
- `https://www.evlog.dev/use-cases/better-auth/overview`

## Shared infrastructure boundaries

- `main.ts`: bootstrap Nest, configure process-wide HTTP behavior, mount Better Auth, and listen.
- `app.module.ts`: configure global Nest modules, including EVLog and oRPC, and import feature modules.
- `evlog.config.ts`: define service-wide logging, sampling, enrichment, route filtering, and drain behavior.
- `orpc-context.ts`: build request context and augment oRPC context types.
- `services.ts`: create process-wide database and authentication instances.
- `env.server.ts`: expose validated server environment values.

Do not move feature behavior into these files. Conversely, do not duplicate global CORS, auth mounting, database creation, or ORPC initialization inside a feature.

## Adding or changing a feature

1. Read the relevant contract and existing feature code.
2. Confirm whether the public API contract must change; if so, update it using `orpc-api-contract` first.
3. Create or update `features/<feature>/<feature>.module.ts`.
4. Implement transport handling in `<feature>.controller.ts`.
5. Add a service only when the behavior exceeds simple adaptation or mapping.
6. Import a new feature module from `app.module.ts`.
7. Search for old controller names and stale imports after moves or renames.
8. Review the final diff for duplicated types, leaked database fields, and unrelated structural churn.
9. Add useful EVLog context for important business operations without logging secrets or duplicating request-wide events.

Preserve existing routes and root contract keys during a structural refactor unless the user explicitly requests an API change.

## Verification

Run focused server checks:

```bash
pnpm --filter server check-types
pnpm exec biome check apps/server/src
```

The type-check also builds the shared API contract, which verifies handler compatibility. Biome should be run without `--write` unless formatting changes are part of the task.

Static checks do not prove Nest discovery, middleware behavior, cookies, or database effects. When runtime verification is requested, start the server and exercise the actual route, including authenticated and error cases.

## Completion checklist

- New behavior lives under the owning `features/<feature>` directory.
- The feature module registers its controllers and providers and is imported by `AppModule`.
- oRPC decorator and implementer reference the same shared contract node.
- Controllers remain thin; business and data logic live in a service when warranted.
- Authentication comes from `context.session`, and expected failures use typed errors.
- EVLog uses the NestJS request scope; feature code enriches the wide event with safe business context.
- Better Auth identity reuses the session resolved by `orpc-context.ts` instead of performing duplicate session lookups.
- oRPC failures are attached to the request logger without replacing typed contract errors or double-logging requests.
- Responses match the public contract without exposing internal fields.
- Focused type and formatting checks pass, or remaining runtime/environment gaps are reported.
