import { z } from "zod";

import type { CrudOperation } from "./types";

export interface RelationConfig<TResource extends string = string> {
	/** Registered resource the relation points to. Its projection and server policy apply to joined rows. */
	resource: TResource;
	many: boolean;
}

export interface SoftDeleteConfig<TField extends string = string> {
	/** Nullable timestamp column: `null` means active, a date means deleted. */
	field: TField;
}

export interface ResourceConfig<
	TSelect extends z.ZodObject = z.ZodObject,
	TCreate extends z.ZodObject = z.ZodObject,
	TUpdate extends z.ZodObject = z.ZodObject,
	TFilter extends string = string,
	TSort extends string = string,
	TRelations extends Record<string, RelationConfig> = Record<
		string,
		RelationConfig
	>,
> {
	/** Public row shape; keys must be columns of the table the server binds (which needs an `id` primary key). Only these columns are selected, for the resource and when it is joined. */
	select: TSelect;
	create: TCreate;
	update: TUpdate;
	filterable: readonly TFilter[];
	sortable: readonly TSort[];
	searchable: readonly string[];
	/** Keys must match relation names in the Drizzle relations config. */
	relations: TRelations;
	defaultOrderBy?: Partial<Record<TSort, "asc" | "desc">>;
	softDelete?: SoftDeleteConfig;
	/** Operations exposed for this resource; anything else is rejected with FORBIDDEN. */
	operations: readonly CrudOperation[];
}

export type AnyResource = ResourceConfig<
	// biome-ignore lint/suspicious/noExplicitAny: upper bound for any zod object shape.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: upper bound for any zod object shape.
	any,
	// biome-ignore lint/suspicious/noExplicitAny: upper bound for any zod object shape.
	any,
	string,
	string,
	Record<string, RelationConfig>
>;

export type AnyResources = Record<string, AnyResource>;

const ALL_OPERATIONS: readonly CrudOperation[] = [
	"list",
	"get",
	"create",
	"update",
	"delete",
	"restore",
	"createMany",
	"updateMany",
	"deleteMany",
];

type ShapeKey<TSelect extends z.ZodObject> = keyof TSelect["shape"] & string;

type PartialShape<TCreate extends z.ZodObject> = z.ZodObject<{
	[K in keyof TCreate["shape"]]: z.ZodOptional<TCreate["shape"][K]>;
}>;

export function defineResource<
	TSelect extends z.ZodObject,
	TCreate extends z.ZodObject = z.ZodObject<Record<never, never>>,
	TUpdate extends z.ZodObject = PartialShape<TCreate>,
	const TFilter extends ShapeKey<TSelect> = never,
	const TSort extends ShapeKey<TSelect> = never,
	const TRelations extends Record<string, RelationConfig> = Record<
		never,
		never
	>,
>(config: {
	select: TSelect;
	create?: TCreate;
	update?: TUpdate;
	filterable?: readonly TFilter[];
	sortable?: readonly TSort[];
	searchable?: readonly ShapeKey<TSelect>[];
	relations?: TRelations;
	defaultOrderBy?: Partial<Record<TSort, "asc" | "desc">>;
	softDelete?: SoftDeleteConfig<ShapeKey<TSelect>>;
	/** Defaults to every operation (`restore` only when `softDelete` is set). */
	operations?: readonly CrudOperation[];
}): NoInfer<
	ResourceConfig<TSelect, TCreate, TUpdate, TFilter, TSort, TRelations>
> {
	if (!("id" in config.select.shape)) {
		throw new Error("CRUD resources must expose an `id` column in `select`");
	}

	const create = config.create ?? (z.strictObject({}) as unknown as TCreate);

	return {
		...config,
		create,
		update: config.update ?? (create.partial() as unknown as TUpdate),
		operations:
			config.operations ??
			ALL_OPERATIONS.filter(
				(operation) => operation !== "restore" || config.softDelete,
			),
		filterable: config.filterable ?? [],
		sortable: config.sortable ?? [],
		searchable: config.searchable ?? [],
		relations: config.relations ?? ({} as TRelations),
	};
}

/** Registers resources and checks that every relation targets a registered resource. */
export function defineResources<const T extends AnyResources>(resources: T): T {
	for (const [name, resource] of Object.entries(resources)) {
		for (const [relation, config] of Object.entries(resource.relations)) {
			if (!(config.resource in resources)) {
				throw new Error(
					`Relation "${name}.${relation}" targets unregistered resource "${config.resource}"`,
				);
			}
		}
	}

	return resources;
}
