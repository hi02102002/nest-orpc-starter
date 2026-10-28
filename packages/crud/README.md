# @app/crud

A shared CRUD layer for the monorepo: **one oRPC router** serves every registered resource. You declare a resource once with zod. Clients get results typed per resource, and the server turns each request into a single Drizzle query (Relational Query API v2) with permissions and tenancy enforced.

```ts
// web: no per-feature contract, controller or service needed
const projects = useQuery(
	orpc.crud.list.queryOptions({
		input: {
			resource: "projects",
			query: { where: { status: "active" }, with: { owner: true }, limit: 20 },
		},
	}),
);
projects.data?.items[0].owner?.name; // string, fully typed
```

> **Only adding a resource?** You don't need to read the engine code. Follow [Adding a resource](#adding-a-resource). The rest of this document is for whoever maintains the engine.

---

## Contents

1. [Adding a resource](#adding-a-resource)
2. [Architecture](#architecture)
3. [Request lifecycle](#request-lifecycle)
4. [Source map](#source-map)
5. [API reference](#api-reference)
6. [Guarantees](#guarantees)
7. [Extending the engine](#extending-the-engine)
8. [Limits and caveats](#limits-and-caveats)
9. [Troubleshooting](#troubleshooting)

---

## Adding a resource

The example below adds a `projects` resource where each user only sees their own projects.

### 1. Drizzle table (`packages/db`)

```ts
// packages/db/src/schema/projects.ts
export const projectStatus = pgEnum("project_status", [
	"active",
	"paused",
	"archived",
]);

export const projects = pgTable("projects", {
	id: uuid("id").defaultRandom().primaryKey(), // required: single-column primary key named `id`
	name: text("name").notNull(),
	status: projectStatus("status").notNull(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }), // only for soft delete
});
```

Export the table from `schema/index.ts` and declare its relations in `relations.ts`. **Relation names here are the keys clients use in `with`.**

```ts
const appRelations = defineRelationsPart(schema, (r) => ({
	projects: { owner: r.one.user({ from: r.projects.ownerId, to: r.user.id }) },
}));

export const relations = {
	...defineRelations(schema),
	...schema.authRelations,
	...appRelations,
};
```

> ⚠️ Don't declare a `user: {...}` key in `appRelations`. Spreading it would replace the `user` relations defined in `authRelations`. If you need `user.projects`, add it to `authRelations` directly.

Generate the migration:

```bash
pnpm --filter @app/db exec drizzle-kit generate --name add-projects
pnpm db:migrate
```

### 2. Register the resource (`packages/api-contract/src/crud.resources.ts`)

This file is **zod only**. It ships to the browser, so never import `drizzle-orm` or `@app/db` here.

```ts
const projectStatusSchema = z.enum(["active", "paused", "archived"]);

projects: defineResource({
	select: z.object({                  // public columns: only these are selected
		id: z.uuid(),
		name: z.string(),
		status: projectStatusSchema,
		ownerId: z.string(),
		createdAt: z.date(),
		updatedAt: z.date(),
		deletedAt: z.date().nullable(),
	}),
	create: z.object({                  // no id, ownerId or timestamps: the server sets those
		name: z.string().trim().min(1).max(200),
		status: projectStatusSchema,
	}),
	// update: defaults to create.partial()
	filterable: ["id", "name", "status", "createdAt"],
	sortable: ["name", "createdAt"],
	searchable: ["name"],
	defaultOrderBy: { createdAt: "desc" },
	softDelete: { field: "deletedAt" },
	relations: { owner: { resource: "users", many: false } },
}),
```

### 3. Bind the table (`apps/server/src/features/crud/crud.tables.ts`)

```ts
export const crudTables = defineTables<CrudResources>()({
	users: user,
	projects,
});
```

This line **fails to compile** if `select` drifts from the table, for example a missing enum value, a key that isn't a column, or a nullability mismatch. Fix the schema; don't cast the error away.

### 4. Policy (`apps/server/src/features/crud/crud.policies.ts`)

```ts
projects: {
	scope: ({ session }) => ({ ownerId: session.user.id }),
	beforeCreate: (data, { session }) => ({ ...data, ownerId: session.user.id }),
},
```

Without a policy, every signed-in user can see the whole table.

### 5. Verify

```bash
pnpm check-types
pnpm exec biome check packages/api-contract apps/server/src apps/web/src
```

Type checks don't prove that scoping works. Test with two real users: user B should get `total = 0` from `list`, and a 404 from `get` or `update` on user A's records.

---

## Architecture

```
 ┌──────────────── web ────────────────┐   ┌────── api-contract (zod, shared) ───────────┐   ┌──────────────────── server ────────────────────┐
 │ orpc.crud = createCrudUtils(...)     │   │ crudResources = defineResources({...})      │   │ CrudController  @Implement(contract.crud.x)   │
 │   .list.queryOptions({ input })      │──▶│ contract.crud = createCrudContract(...)     │──▶│   └─ CrudService.engine = createCrudEngine({  │
 │   .update.mutationOptions({resource})│   │   9 procedures, input = discriminated union │   │        db, resources, tables, policies })     │
 │ ← typed rows (Jsonify<WithResult>)   │   │   on `resource`                             │   │           └─ db.query[table].findMany(...)     │
 └──────────────────────────────────────┘   └─────────────────────────────────────────────┘   └────────────────────────────────────────────────┘
                                                                                               crud.tables.ts   : resource → Drizzle table
                                                                                               crud.policies.ts : scope / can / hooks
```

The design follows three principles:

1. **Allowlist, not blocklist.** A resource, filterable or sortable field, relation or operation can only be used if it is declared. Tables such as `session` and `account` can never be reached, because they are not in the registry.
2. **The contract is decoupled from the database.** `api-contract` holds zod schemas only. Drizzle tables appear only on the server, in `crud.tables.ts`, and `defineTables` checks at compile time that the two sides match.
3. **Types come from the registry.** Row and relation types are derived from each resource's `select` and `relations`, not from Drizzle's internal types. That's why the client doesn't depend on Drizzle.

---

## Request lifecycle

The example request is `POST /api/crud/list` with body `{ resource: "projects", query: { where, with, search, page, limit } }`.

1. **`contract.ts` + `query-schema.ts`**: oRPC validates the input against the discriminated union on `resource`. Non-allowlisted fields, `RAW`, `limit > 100` or an unknown relation -> **400**. ISO date strings are coerced to `Date`.
2. **`require-auth.middleware.ts`**: No session -> **401**.
3. **`server.ts > authorize`**: The operation is not in `operations`, or `can(ctx)` returned `false` -> **403**.
4. **`server.ts > baseFilter`**: Combines, with `AND`: `query.where`, `scope(ctx)`, `deletedAt is null` (for soft-delete resources) and `search` (turned into `OR ilike`, with `%` and `_` escaped).
5. **`server.ts > buildWith`**: Each relation selects only the target resource's `select` columns and also applies the **target's scope and soft delete**. A hidden `one` relation comes back as `null`.
6. **Drizzle**: `findMany` builds **one** SQL statement (lateral joins + `row_to_json`). In parallel, `$count` runs with the same filter to produce `total`.
7. **`contract.ts`**: Returns `{ items, meta }`. Dates are serialized as ISO strings.

Writes:

- **create**: `assertReferences` checks that every foreign key points to a record the caller can see (400 otherwise). Then `beforeCreate` runs, the row is inserted with `INSERT ... RETURNING id`, and it is read back through `get`, so the response has the right projection and `with`.
- **update**: inside a transaction, the row is looked up within scope (404 if it isn't found), foreign keys are checked, `beforeUpdate` runs, then the `UPDATE`. The row is read back at the end.
- **delete**: the row is looked up within scope. Soft-delete resources get `deletedAt = now()`; all others get a hard `DELETE`.
- **restore**: soft-delete resources only. The row is looked up among deleted rows, then `deletedAt` is set to `null`.
- **\*Many**: each runs in one transaction. `updateMany` and `deleteMany` first narrow `ids` to the caller's scope and return only the ids they actually affected.

---

## Source map

- **`src/define.ts`**: `defineResource`, `defineResources`, `ResourceConfig`, the default operation list. _Read it when:_ adding a resource option.
- **`src/types.ts`**: Pure types: `Where`, `With`, `OrderBy`, `WithResult`, `ListQuery`, `CrudInputs`, `Jsonify`, `MAX_RELATION_DEPTH`. _Read it when:_ changing client-side types or adding an operator.
- **`src/query-schema.ts`**: Runtime zod for `where`, `orderBy`, `with` and the list query, built from the registry and cached per `(resource, depth)`. _Read it when:_ adding an operator or changing limits.
- **`src/contract.ts`**: `createCrudContract`: the 9 procedures, routes, error map and output schemas. _Read it when:_ adding an operation or changing routes.
- **`src/server.ts`**: `createCrudEngine`, `defineTables`, `definePolicies`, and `CrudDatabase` (the part of Drizzle the engine relies on). _Read it when:_ changing query logic or security behaviour.
- **`src/client.ts`**: `createCrudUtils`: typed layer over oRPC's TanStack utils, with mutations bound to a resource. _Read it when:_ changing the web API.
- **`src/index.ts`**: Shared exports (contract and types).

Entry points: `@app/crud` is shared, `@app/crud/server` is server-only (it imports Drizzle), and `@app/crud/client` is for the web.

App-side code that uses the engine:

- `packages/api-contract/src/crud.resources.ts`: the registry.
- `apps/server/src/features/crud/`: controller, service, `crud.tables.ts`, `crud.policies.ts`.
- `apps/web/src/utils/orpc.ts`: `orpc.crud`.

---

## API reference

### `defineResource(options)`

| Option           | Required | Description                                                                                                                   |
| ---------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `select`         | yes      | `z.object` of public columns. Must include `id`, and every key must be a column of the bound table.                           |
| `create`         |          | `z.object` for create input. Defaults to an empty object. Unknown keys are stripped.                                          |
| `update`         |          | Defaults to `create.partial()`.                                                                                               |
| `filterable`     |          | Fields allowed in `where`.                                                                                                    |
| `sortable`       |          | Fields allowed in `orderBy`.                                                                                                  |
| `searchable`     |          | Fields that `query.search` matches with `ilike`.                                                                              |
| `relations`      |          | `{ relationName: { resource, many } }`. Names must match the Drizzle relations, and `resource` must be a registered resource. |
| `defaultOrderBy` |          | Sort order used when the client sends no `orderBy`.                                                                           |
| `softDelete`     |          | `{ field }`: a nullable timestamp column. Enables `restore`.                                                                  |
| `operations`     |          | Allowed operations. Defaults to all of them (`restore` only with `softDelete`).                                               |

### Policy (`ResourcePolicy`)

| Key                       | Description                                                           |
| ------------------------- | --------------------------------------------------------------------- |
| `scope(ctx)`              | An RQB `where` object, AND-ed into every read, write, join and count. |
| `can[op](ctx)`            | Return `false` to reject with 403.                                    |
| `beforeCreate(data, ctx)` | Transforms `data` before insert, for example to set `ownerId`.        |
| `beforeUpdate(data, ctx)` | Transforms `data` before update.                                      |

### Query (`list`)

```ts
{
	where?: {
		[field]?: value | { eq, ne, gt, gte, lt, lte, in, notIn, like, ilike, notLike, notIlike, isNull: true, isNotNull: true },
		[relation]?: boolean | Where<target>,   // exists / not exists, up to 2 levels deep
		AND?: Where[], OR?: Where[], NOT?: Where,
	},
	orderBy?: { [sortable]: "asc" | "desc" },
	with?: { [relation]: true | { with?, where?, orderBy?, limit? } },  // where/orderBy/limit only on `many` relations
	search?: string,       // at most 200 characters
	page?: number,         // default 1
	limit?: number,        // default 20, max 100
	withDeleted?: boolean, // soft-delete resources only
}
```

### Operations

| Operation    | Route                        | Input                           | Output            |
| ------------ | ---------------------------- | ------------------------------- | ----------------- |
| `list`       | `POST /api/crud/list`        | `{ resource, query }`           | `{ items, meta }` |
| `get`        | `POST /api/crud/get`         | `{ resource, id, with? }`       | row               |
| `create`     | `POST /api/crud/create`      | `{ resource, data, with? }`     | row               |
| `update`     | `POST /api/crud/update`      | `{ resource, id, data, with? }` | row               |
| `delete`     | `POST /api/crud/delete`      | `{ resource, id }`              | `{ id }`          |
| `restore`    | `POST /api/crud/restore`     | `{ resource, id }`              | row               |
| `createMany` | `POST /api/crud/create-many` | `{ resource, data[] }` (1-500)  | `{ items }`       |
| `updateMany` | `POST /api/crud/update-many` | `{ resource, ids, data }`       | `{ ids }`         |
| `deleteMany` | `POST /api/crud/delete-many` | `{ resource, ids }` (1-500)     | `{ ids }`         |

`meta` is `{ page, limit, total, totalPages, hasNextPage, hasPreviousPage }`.

Errors: `UNAUTHORIZED` 401, `BAD_REQUEST` 400, `FORBIDDEN` 403, `NOT_FOUND` 404.

### Web

```ts
orpc.crud.list.queryOptions({ input: { resource, query } })
orpc.crud.get.queryOptions({ input: { resource, id, with } })
orpc.crud.list.call({ resource, query })                       // direct call, outside TanStack

orpc.crud.create.mutationOptions({ resource, with?, ...tanstackOptions })   // mutate({ data })
orpc.crud.update.mutationOptions({ resource, with?, ... })                  // mutate({ id, data })
orpc.crud.delete / restore.mutationOptions({ resource, ... })               // mutate({ id })
orpc.crud.createMany / updateMany / deleteMany.mutationOptions(...)         // mutate({ data[] } | { ids, data } | { ids })

orpc.crud.key()                       // invalidate every crud query
orpc.crud.key({ resource: "projects" })   // invalidate every query for one resource
```

Returned types:

- Dates are ISO `string`s.
- A `one` relation is typed `T | null`.
- A `many` relation is typed `T[]`.
- A relation only appears in the type when it is requested in `with`.

---

## Guarantees

The engine already does all of the following. Don't re-implement any of it in feature code.

- **Allowlist.** Input is validated with strict zod objects: no `RAW` SQL, no filtering on hidden columns, no joins to unregistered tables.
- **Projection.** Only `select` columns are read, including when the resource is joined. For example, `users` returns only `id`, `name` and `image`.
- **Tenancy.** `scope` applies to the root query, to every join and to `total`. Another tenant's `get`, `update` or `delete` gets a 404 rather than a 403, so the response doesn't reveal that the record exists.
- **Referential integrity.** Writes can't point a foreign key at another tenant's record or at a soft-deleted one.
- **Safe bulk operations.** `updateMany` and `deleteMany` skip ids outside the caller's scope and run in a single transaction.

---

## Extending the engine

**Add a filter operator** (for example `arrayContains`):

1. Add it to `FieldFilter` in `src/types.ts`.
2. Add it to `fieldFilterSchema` in `src/query-schema.ts`.
3. The engine needs no change, because `where` objects are passed through to RQB v2 as they are. Just make sure Drizzle supports the operator.

**Add an operation** (for example `count`):

1. Add it to `CrudOperation` and `CrudInputs` in `types.ts`, and to `ALL_OPERATIONS` in `define.ts`.
2. Add the procedure in `createCrudContract` (`contract.ts`).
3. Add a method to the object returned by `createCrudEngine` (`server.ts`). Call `authorize` and use `baseFilter`.
4. Add a handler in `CrudController`.
5. Type it in `CrudUtils` (`client.ts`). If it's a mutation, also add it to `MUTATIONS`.

**Change the join depth** by editing `MAX_RELATION_DEPTH` in `types.ts`. The same constant drives both the types and the runtime schemas. The size of the OpenAPI schema grows exponentially with depth.

---

## Limits and caveats

- **Primary key.** Every resource needs a single-column primary key named `id`.
- **`total` relies on `relationsFilterToSQL`**, an internal function of `drizzle-orm@1.0.0-rc`. After upgrading Drizzle, re-test a `list` that combines a relation filter with `meta.total`.
- **NestJS dev runs under `tsx`**, which doesn't emit decorator metadata. Constructor injection therefore uses explicit tokens: `@Inject(CrudService)` and `@Inject(getDrizzleToken())`.
- **Dates in input** arrive as ISO strings. For date fields in `create` or `update`, use `z.iso.datetime().pipe(z.coerce.date())`. A bare `z.coerce.date()` can't be expressed in JSON Schema, so the request body disappears from the OpenAPI docs.
- **The OpenAPI schema for `list` is large**, tens of KB per resource, because nested filters are fully expanded.
- **Not for business workflows.** Payments, multi-step workflows and anything with side effects belong in a dedicated feature (see the `orpc-api-contract` and `app-server` skills). `pnpm generate:crud` still scaffolds that kind of feature.

---

## Troubleshooting

| Symptom                                                                    | Likely cause                                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Server fails to start: `"x" is not a Drizzle relation of "y"`              | A name in the resource's `relations` doesn't match the DB `relations.ts`.                                                                   |
| Server fails to start: `table is not part of the Drizzle relations config` | The table isn't exported from `schema/index.ts`.                                                                                            |
| Server fails to start: `select keys [...] are not columns`                 | `select` contains a key that isn't a column of the table.                                                                                   |
| `crud.tables.ts` reports `"select schema does not match..."`               | The zod schema and the table disagree (enum values, nullability or types).                                                                  |
| `400 Input validation failed`                                              | A field isn't in `filterable` or `sortable`, a relation isn't declared, or a value has the wrong type. Check `data.issues` in the response. |
| `403 "create" is not enabled`                                              | The resource restricts `operations`.                                                                                                        |
| A join returns `null` even though the row exists                           | The target row is out of scope or soft-deleted. This is intended.                                                                           |
| `500 Cannot read properties of undefined (reading 'engine')`               | An explicit `@Inject(...)` is missing from a constructor (see the `tsx` caveat above).                                                      |
| `/api/openapi.json` returns 500                                            | An input schema can't be converted to JSON Schema (for example `z.coerce.date()`), or a route uses a path param.                            |

To see the SQL the engine generates, temporarily pass `logger: true` to `drizzle(...)` in `packages/db/src/index.ts`.
