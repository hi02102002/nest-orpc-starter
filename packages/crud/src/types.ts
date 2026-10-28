import type { z } from "zod";

import type { AnyResources } from "./define";

export const MAX_RELATION_DEPTH = 2;

type Empty = Record<never, never>;
type Depth = readonly unknown[];
type Next<D extends Depth> = readonly [...D, unknown];
type AtMax<D extends Depth> = D["length"] extends typeof MAX_RELATION_DEPTH
	? true
	: false;

export type ResourceName<T extends AnyResources> = keyof T & string;

export type Row<T extends AnyResources, R extends ResourceName<T>> = z.output<
	T[R]["select"]
>;

export type CreateData<
	T extends AnyResources,
	R extends ResourceName<T>,
> = z.input<T[R]["create"]>;

export type UpdateData<
	T extends AnyResources,
	R extends ResourceName<T>,
> = z.input<T[R]["update"]>;

type Relations<
	T extends AnyResources,
	R extends ResourceName<T>,
> = T[R]["relations"];

type RelationTarget<
	T extends AnyResources,
	R extends ResourceName<T>,
	K extends keyof Relations<T, R>,
> = Relations<T, R>[K]["resource"] extends infer N extends ResourceName<T>
	? N
	: never;

type FilterValue<V> = V extends Date ? Date | string : V;

export type FieldFilter<V> =
	| FilterValue<V>
	| {
			eq?: FilterValue<V>;
			ne?: FilterValue<V>;
			gt?: FilterValue<V>;
			gte?: FilterValue<V>;
			lt?: FilterValue<V>;
			lte?: FilterValue<V>;
			in?: FilterValue<V>[];
			notIn?: FilterValue<V>[];
			like?: string;
			ilike?: string;
			notLike?: string;
			notIlike?: string;
			isNull?: true;
			isNotNull?: true;
	  };

export type Where<
	T extends AnyResources,
	R extends ResourceName<T>,
	D extends Depth = readonly [],
> = {
	[F in T[R]["filterable"][number] & keyof Row<T, R>]?: FieldFilter<
		NonNullable<Row<T, R>[F]>
	>;
} & {
	AND?: Where<T, R, D>[];
	OR?: Where<T, R, D>[];
	NOT?: Where<T, R, D>;
} & (AtMax<D> extends true
		? Empty
		: {
				[K in keyof Relations<T, R>]?:
					| boolean
					| Where<T, RelationTarget<T, R, K>, Next<D>>;
			});

export type OrderBy<T extends AnyResources, R extends ResourceName<T>> = {
	[F in T[R]["sortable"][number]]?: "asc" | "desc";
};

export type With<
	T extends AnyResources,
	R extends ResourceName<T>,
	D extends Depth = readonly [],
> =
	AtMax<D> extends true
		? Empty
		: {
				[K in keyof Relations<T, R>]?:
					| true
					| ({
							with?: With<T, RelationTarget<T, R, K>, Next<D>>;
					  } & (Relations<T, R>[K]["many"] extends true
							? {
									where?: Where<T, RelationTarget<T, R, K>>;
									orderBy?: OrderBy<T, RelationTarget<T, R, K>>;
									limit?: number;
								}
							: Empty));
			};

type NestedWith<W> = W extends { with: infer N } ? N : Empty;

export type WithResult<
	T extends AnyResources,
	R extends ResourceName<T>,
	W,
> = Row<T, R> & {
	-readonly [K in keyof W & keyof Relations<T, R> as W[K] extends
		| undefined
		| false
		? never
		: K]: Relations<T, R>[K]["many"] extends true
		? WithResult<T, RelationTarget<T, R, K>, NestedWith<W[K]>>[]
		: WithResult<T, RelationTarget<T, R, K>, NestedWith<W[K]>> | null;
};

export interface ListQuery<
	T extends AnyResources,
	R extends ResourceName<T>,
	W = With<T, R>,
> {
	where?: Where<T, R>;
	orderBy?: OrderBy<T, R>;
	with?: W;
	search?: string;
	page?: number;
	limit?: number;
	/** Soft-delete resources only: include deleted rows. */
	withDeleted?: boolean;
}

export interface ListMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

export interface ListOutput<TItem> {
	items: TItem[];
	meta: ListMeta;
}

type ByResource<T extends AnyResources, TShape> = {
	[R in ResourceName<T>]: { resource: R } & TShape;
}[ResourceName<T>];

/** Input unions, keyed by resource, used by the contract and the server handlers. */
export type CrudInputs<T extends AnyResources> = {
	list: {
		[R in ResourceName<T>]: { resource: R; query?: ListQuery<T, R> };
	}[ResourceName<T>];
	get: {
		[R in ResourceName<T>]: { resource: R; id: string; with?: With<T, R> };
	}[ResourceName<T>];
	create: {
		[R in ResourceName<T>]: {
			resource: R;
			data: CreateData<T, R>;
			with?: With<T, R>;
		};
	}[ResourceName<T>];
	update: {
		[R in ResourceName<T>]: {
			resource: R;
			id: string;
			data: UpdateData<T, R>;
			with?: With<T, R>;
		};
	}[ResourceName<T>];
	delete: ByResource<T, { id: string }>;
	restore: ByResource<T, { id: string }>;
	createMany: {
		[R in ResourceName<T>]: { resource: R; data: CreateData<T, R>[] };
	}[ResourceName<T>];
	updateMany: {
		[R in ResourceName<T>]: {
			resource: R;
			ids: string[];
			data: UpdateData<T, R>;
		};
	}[ResourceName<T>];
	deleteMany: ByResource<T, { ids: string[] }>;
};

export type CrudOperation =
	| "list"
	| "get"
	| "create"
	| "update"
	| "delete"
	| "restore"
	| "createMany"
	| "updateMany"
	| "deleteMany";

/** Date -> string, as rows arrive over JSON through `JsonifiedClient`. */
export type Jsonify<T> = T extends Date
	? string
	: T extends readonly (infer U)[]
		? Jsonify<U>[]
		: T extends object
			? { [K in keyof T]: Jsonify<T[K]> }
			: T;
