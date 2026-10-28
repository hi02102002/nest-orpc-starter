---
name: petshop-server
description: "Build, refactor, debug, and review the Petshop NestJS server in `apps/server`. Use this skill whenever a task changes a server feature, Nest module, controller, service, oRPC handler implementation, authentication/session access, database access, CORS, environment configuration, startup wiring, or server folder structure. Use it even for a small endpoint change so code stays feature-based and aligned with the shared oRPC contract."
---

# Petshop Server

Work in `apps/server` using NestJS feature modules and the repository's contract-first oRPC architecture. Keep transport wiring thin, organize behavior by feature, and preserve the boundary between shared infrastructure and feature code.

For changes to the public API shape, also use the `orpc-api-contract` skill. This skill owns the server implementation and folder structure; `orpc-api-contract` owns input/output schemas, routes, and typed API errors.

## Server structure

Keep the server organized like this:

```text
apps/server/src/
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

## Shared infrastructure boundaries

- `main.ts`: bootstrap Nest, configure process-wide HTTP behavior, mount Better Auth, and listen.
- `app.module.ts`: configure global Nest modules and import feature modules.
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
- Responses match the public contract without exposing internal fields.
- Focused type and formatting checks pass, or remaining runtime/environment gaps are reported.
