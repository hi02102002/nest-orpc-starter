---
name: orpc-api-contract
description: "Create and change contract-first oRPC v2 APIs in this Petshop monorepo. Use this skill whenever a task adds, edits, debugs, or reviews an API endpoint, Zod request or response schema, typed API error, OpenAPI route, NestJS oRPC implementation, or web client call involving `packages/api-contract`, `@orpc/contract`, `@orpc/nest`, `OpenAPILink`, or `@petshop/api-contract`. Also use it for apparently small endpoint changes because the contract, server implementation, and client types must remain aligned."
---

# Petshop oRPC API Contract

Use the repository's contract-first oRPC v2 architecture. The shared contract is the source of truth; the server implements it, and the web app consumes its inferred client type.

## Architecture

Trace every API change through these layers:

1. `packages/api-contract/src/<feature>.contract.ts` defines one feature's schemas, routes, outputs, and typed errors with `oc`.
2. `packages/api-contract/src/index.ts` imports feature contracts and composes the root `contract`.
3. `apps/server/src/api.controller.ts` implements each contract procedure with NestJS `@Implement` and `implement(...).handler(...)`.
4. `apps/server/src/orpc-context.ts` supplies request context such as the current session.
5. `apps/web/src/utils/orpc.ts` creates an `OpenAPILink`, the typed client, and TanStack Query utilities.
6. Feature code calls the generated utilities or client without redeclaring API types.

Inspect the current files before editing. Preserve established naming, route layout, authentication behavior, and formatting unless the task explicitly changes them.

## Define the contract

Put each feature in a dedicated file such as `pets.contract.ts`, `orders.contract.ts`, or `users.contract.ts`. Use `oc` from `@orpc/contract`, Zod, and `openapi` metadata inside that feature file.

```ts
// packages/api-contract/src/pets.contract.ts
export const petsContract = {
	get: oc
		.meta(openapi({ method: "GET", path: "/api/pets/{id}" }))
		.input(z.object({ id: z.string() }))
		.errors({
			NOT_FOUND: { message: "Pet not found" },
		})
		.output(
			z.object({
				id: z.string(),
				name: z.string(),
			}),
		),
};
```

Import the feature contract into the package entry point and compose the root router there:

```ts
// packages/api-contract/src/index.ts
import { petsContract } from "./pets.contract";

export const contract = {
	pets: petsContract,
};

export type AppRouterClient = JsonifiedClient<
	RouterContractClient<typeof contract>
>;
```

Apply these rules:

- Define `.output(...)` for every procedure so clients never infer `unknown`.
- Define `.input(...)` for all path, query, or body data. Do not trust handler-only validation.
- Keep one-off input and output schemas inline in the procedure chain. Do not create or export a named schema or TypeScript type used only once.
- Extract a named Zod schema only when multiple procedures genuinely reuse it. Export it only when another module needs to import it.
- Prefer client inference from `AppRouterClient`; do not export DTO types merely for frontend convenience. If a reusable standalone type is truly needed, infer it from the reusable Zod schema with `z.infer` instead of writing the shape twice.
- Put REST routing in `.meta(openapi(...))`; keep paths under the existing `/api` prefix.
- Match the HTTP method to behavior: `GET` reads, `POST` creates, `PATCH` updates partially, and `DELETE` removes.
- Declare expected business failures with `.errors(...)`. Do not turn normal cases such as missing records or unauthenticated access into untyped exceptions.
- Keep sensitive and server-only fields out of output schemas. The output schema is the public API boundary.
- Preserve `AppRouterClient` as `JsonifiedClient<RouterContractClient<typeof contract>>` because this project uses `OpenAPILink` serialization.

Each feature contract should export its feature router object. `index.ts` stays small: imports, root composition, and root client types only. Do not place procedure definitions in `index.ts` once a feature contract file exists.

Prefer nested routers when a feature has multiple related groups, but do not reorganize unrelated existing endpoints during a focused change.

## Implement the NestJS procedure

Mirror the exact contract node in `apps/server/src/api.controller.ts`:

```ts
@Implement(contract.pets.get)
getPet() {
	return implement(contract.pets.get).handler(async ({ input, errors }) => {
		const pet = await this.petService.findById(input.id);

		if (!pet) {
			throw errors.NOT_FOUND();
		}

		return pet;
	});
}
```

The decorator and `implement(...)` call must reference the same procedure. Return a value that satisfies the contract output exactly; let TypeScript expose drift instead of casting around it.

For authenticated procedures, read the session from the existing oRPC context and throw the declared typed error:

```ts
if (!context.session?.user) {
	throw errors.UNAUTHORIZED();
}
```

Keep business and database logic in the appropriate service or package when one exists. Controllers should adapt validated API input to that logic and map results to the public response shape.

## Consume from the web app

The shared `AppRouterClient` type should carry new procedures into `apps/web/src/utils/orpc.ts`; do not duplicate request or response interfaces in the web app.

Use the existing exported `orpc` TanStack Query utilities for React data access. Follow nearby query and mutation call sites for the installed `@orpc/tanstack-query` API instead of guessing from older oRPC versions.

Keep cookie authentication working by preserving `credentials: "include"` in the link's custom fetch. Do not create a second oRPC client for one feature unless the endpoint genuinely needs a different origin or transport policy.

## Change workflow

1. Read the current contract, controller, context, and relevant data/service code.
2. Decide the public input, output, route, and typed error behavior before writing the handler.
3. Update or create the feature's `*.contract.ts` file first, then compose it in `index.ts`.
4. Implement the same contract node on the server.
5. Update the web call site only when the user-facing feature requires it.
6. Search for old procedure names and duplicated API types after renames.
7. Review the final diff across all touched layers for contract drift or accidental unrelated edits.

If the requested behavior is unclear, preserve the narrowest compatible API shape. Do not broaden nullable fields, expose database rows directly, or add fallback behavior merely to silence a type error.

## Verification

Run the smallest checks that cover the changed layers, using the workspace package manager:

```bash
pnpm --filter @petshop/api-contract check-types
pnpm --filter server check-types
pnpm --filter web check-types
```

Only run the web check when web code or shared client inference is affected. If a package script or filter differs, inspect its `package.json` and use the actual script rather than inventing one.

Type checks prove contract alignment, not runtime routing. When runtime proof is requested, start the relevant apps and verify the actual HTTP route, status, response body, cookies, and typed error behavior.

## Completion checklist

- Contract input, output, metadata, and errors describe the intended public API.
- Procedures live in the relevant `*.contract.ts`; `index.ts` only composes feature contracts and exports root types.
- One-off schemas and types remain inline; reusable schemas are extracted without duplicating their TypeScript shapes.
- NestJS decorator and handler implement the same contract node.
- Authentication uses request context and a declared error.
- Server results contain no fields outside the public output shape.
- Web code consumes inferred types instead of redefining them.
- Relevant focused checks pass, or any unrun/runtime verification gap is stated clearly.

## oRPC documentation boundary

This repository uses oRPC v2. If an unfamiliar API is needed, consult the installed `orpc`, `orpc-contract`, or `orpc-openapi` skill and current documentation at `https://orpc.dev`; do not rely on remembered oRPC v1 syntax.
