---

name: petshop-crud
description: "Add, change, debug, or review resources served by the generic CRUD layer (`@petshop/crud`, `contract.crud`, `orpc.crud`) in the Petshop monorepo. Use this skill whenever a task exposes a table through CRUD, lists/filters/joins records from the web with `orpc.crud.*`, adds tenancy scope, permissions or write hooks for a resource, enables soft delete, or touches `packages/crud`, `crud.resources.ts`, `crud.tables.ts`, or `crud.policies.ts`. Prefer it over hand-writing a per-feature contract, service and controller for plain CRUD; use `orpc-api-contract` and `petshop-server` for endpoints with real business logic."
---

# Petshop generic CRUD

One oRPC router serves every registered resource. A resource is declared once with zod (shared, isomorphic), bound to a Drizzle table on the server, and optionally given a server-only policy. The web gets per-resource types for rows, filters and joins.

## Where things live

| Layer | File | Holds |
|---|---|---|
| Engine | `packages/crud/src/*` | `defineResource`, contract builder, RQB v2 engine, typed TanStack utils. Knows nothing about petshop tables. |
| Registry (shared) | `packages/api-contract/src/crud.resources.ts` | zod `select` / `create` / `update`, allowlists, relations, soft delete, operations. |
| Table binding (server) | `apps/server/src/features/crud/crud.tables.ts` | `defineTables<CrudResources>()({ resource: table })`. |
| Policies (server) | `apps/server/src/features/crud/crud.policies.ts` | `scope`, `can`, `beforeCreate`, `beforeUpdate`. |
| Web | `apps/web/src/utils/orpc.ts` | `orpc.crud = createCrudUtils<CrudResources>(utils.crud)`. |

Keep the boundary: `@petshop/api-contract` must never import `@petshop/db`, `drizzle-orm` or table objects. It ships to the browser and must stay zod-only. Tables enter only in `crud.tables.ts`.

## Add a resource

1. **Table and relations.** Add the Drizzle table in `packages/db/src/schema/<name>.ts` with an `id` primary key, export it from `schema/index.ts`, and add relations in `packages/db/src/relations.ts`. Relation names here are the keys clients use in `with`. Then run `pnpm db:generate`.
2. **Register the resource** in `crud.resources.ts`:

```ts
pets: defineResource({
	select: z.object({ id: z.uuid(), name: z.string(), species: speciesSchema, ownerId: z.string(), createdAt: z.date(), updatedAt: z.date(), deletedAt: z.date().nullable() }),
	create: z.object({ name: z.string().trim().min(1).max(200), species: speciesSchema }), // omit id, ownerId, timestamps
	// update defaults to create.partial()
	filterable: ["id", "name", "species", "createdAt"],
	sortable: ["name", "createdAt"],
	searchable: ["name"],             // query.search -> OR ilike, % and _ escaped
	defaultOrderBy: { createdAt: "desc" },
	softDelete: { field: "deletedAt" }, // enables `restore`; deletes set the timestamp
	relations: { owner: { resource: "users", many: false } }, // target must be a registered resource
	// operations: ["list", "get"],     // allowlist; default = all (restore only with softDelete)
}),
```

   - `select` is the public projection. Only its keys are selected, both for the resource and when it is joined. Leave internal columns (tokens, emails, flags) out of it.
   - `create` must not contain server-managed fields such as `ownerId`, `id` or timestamps; set those in `beforeCreate`. Zod strips any extra keys a client sends.
   - Only list fields in `filterable` and `sortable` that the client is allowed to filter or sort on.
3. **Bind the table** in `crud.tables.ts`: `pets`. This fails to compile when `select` drifts from the table, for example a missing enum value, a key that is not a column, or a nullable mismatch. Fix the schema; never cast the error away.
4. **Add a policy** when rows belong to someone:

```ts
pets: {
	scope: ({ session }) => ({ ownerId: session.user.id }),   // AND-ed into every read/write, and into joins
	beforeCreate: (data, { session }) => ({ ...data, ownerId: session.user.id }),
	can: { deleteMany: ({ session }) => session.user.role === "admin" },
},
```

5. Run `pnpm check-types` and `pnpm exec biome check packages/crud packages/api-contract apps/server/src apps/web/src`.

## Use it from the web

```ts
const { orpc } = Route.useRouteContext();

useQuery(orpc.crud.list.queryOptions({
	input: {
		resource: "pets",
		query: {
			where: { species: { in: ["cat", "dog"] }, owner: { name: { ilike: "%an%" } }, OR: [...] },
			orderBy: { createdAt: "desc" },
			with: { owner: true },          // nested: { project: { with: { owner: true } } }; many: { where, orderBy, limit }
			search: "tom", page: 1, limit: 20, // limit ≤ 100
		},
	},
}));

const update = useMutation(orpc.crud.update.mutationOptions({ resource: "pets", with: { owner: true }, onSuccess: () =>
	queryClient.invalidateQueries({ queryKey: orpc.crud.key({ resource: "pets" }) }) }));
update.mutate({ id, data: { name: "Tom" } });
```

- Queries take `{ input: { resource, ... } }`. Mutations bind `resource` (and `with`) once in `mutationOptions`, then `mutate()` takes only `{ id, data }`, `{ data }`, `{ ids, data }` or `{ ids }`.
- Rows arrive jsonified: dates are ISO strings. A `one` relation is `T | null`, which also covers a target hidden by its scope or soft delete. A `many` relation is `T[]`.
- `list` returns `{ items, meta: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }`.
- Operations: `list`, `get`, `create`, `update`, `delete`, `restore`, `createMany`, `updateMany`, `deleteMany`. Bulk calls accept 1–500 rows or ids. `updateMany` and `deleteMany` return only the ids the caller could see.
- Wire routes are `POST /api/crud/<op>`, with `resource` in the body.

## Guarantees the engine provides (do not re-implement)

- Only declared fields, operators and relations are accepted; `RAW` and unknown keys get 400. Relation filters and `with` stop at depth 2.
- Scope and soft delete apply to the root query, to every join, and to the `total` count.
- Writes reject foreign keys that point to rows the caller cannot see (another tenant's or soft-deleted) with 400.
- Operations outside `operations`, or ones a `can` check rejects, get 403. A missing or out-of-scope row gets 404.

## Gotchas

- The NestJS dev server runs under `tsx`, which emits no decorator metadata. Constructor injection in this feature therefore uses explicit tokens: `@Inject(CrudService)` and `@Inject(getDrizzleToken())`. Keep them.
- Date filters accept ISO date or datetime strings, coerced server-side. Write schemas that take dates should use `z.coerce.date()` or `z.iso.datetime().pipe(z.coerce.date())`, because clients send strings.
- The `total` count uses Drizzle's `relationsFilterToSQL` (an internal of `drizzle-orm@1.0.0-rc`). After upgrading Drizzle, re-test a list that combines a relation filter with `meta.total`.
- Every resource needs a single-column `id` primary key.
- Not a fit for endpoints with real business rules (multi-step workflows, payments, side effects). Build those as a normal feature with the `orpc-api-contract` and `petshop-server` skills. `pnpm generate:crud` still scaffolds that per-feature style.

## Verify a change

Static checks prove neither tenancy nor joins. For a new resource with a policy, run the server against a database and check over HTTP with a real session cookie:
- create sets the owner on the server;
- `list` with `with`, a filter and a sort returns the right `meta.total`;
- a second user gets 404 on `get` and `update`, and `deleteMany` returns `ids: []`;
- a non-allowlisted filter or relation returns 400.
