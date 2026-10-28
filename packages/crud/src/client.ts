import type { ClientContext } from "@orpc/client";
import type {
	MutationOptionsIn,
	MutationOptionsOut,
	QueryOptionsIn,
	QueryOptionsOut,
} from "@orpc/tanstack-query";

import type { AnyResources } from "./define";
import type {
	CreateData,
	Jsonify,
	ListOutput,
	ListQuery,
	ResourceName,
	UpdateData,
	With,
	WithResult,
} from "./types";

type Empty = Record<never, never>;

export type CrudClientError = Error;

/** A row as the client receives it: projected columns, requested relations, dates as strings. */
export type CrudRow<
	T extends AnyResources,
	R extends ResourceName<T>,
	W = Empty,
> = Jsonify<WithResult<T, R, W>>;

type QueryExtras<TOutput, TSelectData> = Omit<
	QueryOptionsIn<
		ClientContext,
		unknown,
		TOutput,
		CrudClientError,
		TSelectData,
		undefined
	>,
	"input"
>;

type Query<TOutput, TSelectData> = QueryOptionsOut<
	TOutput,
	CrudClientError,
	TSelectData,
	undefined
>;

/** Mutation options bound to one resource: `resource` (and `with`) are injected into every mutate() call. */
type BoundMutationIn<R, TVariables, TOutput, UContext, W = never> = {
	resource: R;
	with?: W;
} & MutationOptionsIn<
	ClientContext,
	TVariables,
	TOutput,
	CrudClientError,
	UContext
>;

type Mutation<TVariables, TOutput, UContext> = MutationOptionsOut<
	TVariables,
	TOutput,
	CrudClientError,
	UContext
>;

type ListResult<
	T extends AnyResources,
	R extends ResourceName<T>,
	W,
> = ListOutput<CrudRow<T, R, W>>;

export interface CrudUtils<T extends AnyResources> {
	/** Partial key for invalidation: every crud query, or every query of one resource. */
	key(options?: { resource?: ResourceName<T> }): readonly unknown[];

	list: {
		queryOptions<
			R extends ResourceName<T>,
			const W extends With<T, R> = Empty,
			USelectData = ListResult<T, R, W>,
		>(
			options: {
				input: { resource: R; query?: ListQuery<T, R, W> };
			} & QueryExtras<ListResult<T, R, W>, USelectData>,
		): Query<ListResult<T, R, W>, USelectData>;
		call<R extends ResourceName<T>, const W extends With<T, R> = Empty>(input: {
			resource: R;
			query?: ListQuery<T, R, W>;
		}): Promise<ListResult<T, R, W>>;
	};

	get: {
		queryOptions<
			R extends ResourceName<T>,
			const W extends With<T, R> = Empty,
			USelectData = CrudRow<T, R, W>,
		>(
			options: { input: { resource: R; id: string; with?: W } } & QueryExtras<
				CrudRow<T, R, W>,
				USelectData
			>,
		): Query<CrudRow<T, R, W>, USelectData>;
		call<R extends ResourceName<T>, const W extends With<T, R> = Empty>(input: {
			resource: R;
			id: string;
			with?: W;
		}): Promise<CrudRow<T, R, W>>;
	};

	create: {
		mutationOptions<
			R extends ResourceName<T>,
			const W extends With<T, R> = Empty,
			UContext = unknown,
		>(
			options: BoundMutationIn<
				R,
				{ data: CreateData<T, R> },
				CrudRow<T, R, W>,
				UContext,
				W
			>,
		): Mutation<{ data: CreateData<T, R> }, CrudRow<T, R, W>, UContext>;
	};

	update: {
		mutationOptions<
			R extends ResourceName<T>,
			const W extends With<T, R> = Empty,
			UContext = unknown,
		>(
			options: BoundMutationIn<
				R,
				{ id: string; data: UpdateData<T, R> },
				CrudRow<T, R, W>,
				UContext,
				W
			>,
		): Mutation<
			{ id: string; data: UpdateData<T, R> },
			CrudRow<T, R, W>,
			UContext
		>;
	};

	delete: {
		mutationOptions<R extends ResourceName<T>, UContext = unknown>(
			options: BoundMutationIn<R, { id: string }, { id: string }, UContext>,
		): Mutation<{ id: string }, { id: string }, UContext>;
	};

	restore: {
		mutationOptions<R extends ResourceName<T>, UContext = unknown>(
			options: BoundMutationIn<R, { id: string }, CrudRow<T, R>, UContext>,
		): Mutation<{ id: string }, CrudRow<T, R>, UContext>;
	};

	createMany: {
		mutationOptions<R extends ResourceName<T>, UContext = unknown>(
			options: BoundMutationIn<
				R,
				{ data: CreateData<T, R>[] },
				{ items: CrudRow<T, R>[] },
				UContext
			>,
		): Mutation<
			{ data: CreateData<T, R>[] },
			{ items: CrudRow<T, R>[] },
			UContext
		>;
	};

	updateMany: {
		mutationOptions<R extends ResourceName<T>, UContext = unknown>(
			options: BoundMutationIn<
				R,
				{ ids: string[]; data: UpdateData<T, R> },
				{ ids: string[] },
				UContext
			>,
		): Mutation<
			{ ids: string[]; data: UpdateData<T, R> },
			{ ids: string[] },
			UContext
		>;
	};

	deleteMany: {
		mutationOptions<R extends ResourceName<T>, UContext = unknown>(
			options: BoundMutationIn<
				R,
				{ ids: string[] },
				{ ids: string[] },
				UContext
			>,
		): Mutation<{ ids: string[] }, { ids: string[] }, UContext>;
	};
}

type AnyFn = (...args: never[]) => unknown;

interface RawProcedureUtils {
	call: AnyFn;
	queryOptions: AnyFn;
	mutationOptions(options: Record<string, unknown>): {
		mutationFn?: (
			variables: Record<string, unknown>,
			context: unknown,
		) => unknown;
	};
}

interface RawCrudUtils {
	key(options?: { input?: unknown }): readonly unknown[];
	list: RawProcedureUtils;
	get: RawProcedureUtils;
	create: RawProcedureUtils;
	update: RawProcedureUtils;
	delete: RawProcedureUtils;
	restore: RawProcedureUtils;
	createMany: RawProcedureUtils;
	updateMany: RawProcedureUtils;
	deleteMany: RawProcedureUtils;
}

const MUTATIONS = [
	"create",
	"update",
	"delete",
	"restore",
	"createMany",
	"updateMany",
	"deleteMany",
] as const;

/**
 * Wraps the oRPC TanStack utils of a crud router so results are typed per resource:
 * `crud.list.queryOptions({ input: { resource: "tasks", query: { with: { project: true } } } })`.
 */
export function createCrudUtils<T extends AnyResources>(
	utils: unknown,
): CrudUtils<T> {
	const raw = utils as RawCrudUtils;

	const mutations = Object.fromEntries(
		MUTATIONS.map((operation) => [
			operation,
			{
				mutationOptions: ({
					resource,
					with: withArg,
					...options
				}: Record<string, unknown>) => {
					const base = raw[operation].mutationOptions(options);
					return {
						...base,
						mutationFn: (
							variables: Record<string, unknown>,
							context: unknown,
						) =>
							base.mutationFn?.(
								{
									...variables,
									resource,
									...(withArg ? { with: withArg } : {}),
								},
								context,
							),
					};
				},
			},
		]),
	);

	return {
		key: (options?: { resource?: string }) =>
			raw.key(
				options?.resource
					? { input: { resource: options.resource } }
					: undefined,
			),
		list: raw.list,
		get: raw.get,
		...mutations,
	} as unknown as CrudUtils<T>;
}
