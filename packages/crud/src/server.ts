import { ORPCError } from "@orpc/server";
import {
	getTableColumns,
	type InferSelectModel,
	inArray,
	type RelationsRecord,
	relationsFilterToSQL,
	SQL,
	type Table,
	type TablesRelationalConfig,
} from "drizzle-orm";
import type { z } from "zod";

import type { AnyResource, AnyResources } from "./define";
import type {
	CreateData,
	CrudInputs,
	CrudOperation,
	ListOutput,
	ResourceName,
	UpdateData,
} from "./types";

type Filter = Record<string, unknown>;
type Awaitable<T> = Promise<T> | T;

export interface ResourcePolicy<
	TContext,
	TCreate = Record<string, unknown>,
	TUpdate = Record<string, unknown>,
> {
	/** RQB `where` object AND-ed into every read and write, including when the resource is joined via `with` (many relations). */
	scope?: (context: TContext) => Filter | undefined;
	/** Return false to reject the operation with FORBIDDEN. */
	can?: Partial<
		Record<CrudOperation, (context: TContext) => Awaitable<boolean>>
	>;
	beforeCreate?: (
		data: TCreate,
		context: TContext,
	) => Awaitable<Record<string, unknown>>;
	beforeUpdate?: (
		data: TUpdate,
		context: TContext,
	) => Awaitable<Record<string, unknown>>;
}

export type CrudPolicies<T extends AnyResources, TContext> = {
	[R in ResourceName<T>]?: ResourcePolicy<
		TContext,
		CreateData<T, R>,
		UpdateData<T, R>
	>;
};

export function definePolicies<T extends AnyResources, TContext>(
	policies: CrudPolicies<T, TContext>,
) {
	return policies;
}

type Row = Record<string, unknown>;

interface QueryTable {
	findMany(config: Row): Promise<Row[]>;
	findFirst(config: Row): Promise<Row | undefined>;
}

interface WriteBuilder extends PromiseLike<Row[]> {
	values(values: Row | Row[]): WriteBuilder;
	set(values: Row): WriteBuilder;
	where(condition: SQL | undefined): WriteBuilder;
	returning(fields?: Row): WriteBuilder;
}

/** The slice of a Drizzle RQB v2 database the engine relies on. */
export interface CrudDatabase {
	_: { relations: TablesRelationalConfig };
	query: Record<string, unknown>;
	insert(table: Table): WriteBuilder;
	update(table: Table): WriteBuilder;
	delete(table: Table): WriteBuilder;
	$count(table: Table, filters?: SQL): PromiseLike<number>;
	transaction<TResult>(
		run: (tx: CrudDatabase) => Promise<TResult>,
	): Promise<TResult>;
}

interface ForeignKey {
	relation: string;
	resource: string;
	sourceKey: string;
	targetKey: string;
}

interface ResolvedResource {
	name: string;
	config: AnyResource;
	table: Table;
	key: string;
	idColumn: unknown;
	relations: RelationsRecord;
	columns: Record<string, true>;
	/** Single-column `one` relations, checked on writes so rows cannot point at records the caller cannot see. */
	foreignKeys: ForeignKey[];
}

type RelationColumn = { _: { column: unknown } };

function columnKey(table: Table, column: unknown) {
	return Object.entries(getTableColumns(table)).find(
		([, candidate]) => candidate === column,
	)?.[0];
}

/** Server-side binding of each resource to its Drizzle table; the shared contract never sees tables. */
export type CrudTables<T extends AnyResources> = {
	[R in ResourceName<T>]: Table;
};

type TableBinding<TSelect extends z.ZodObject, TTable> = TTable extends Table
	? keyof z.output<TSelect> extends keyof InferSelectModel<TTable>
		? Pick<
				InferSelectModel<TTable>,
				keyof z.output<TSelect>
			> extends z.output<TSelect>
			? TTable
			: "select schema does not match the table's column types"
		: "select schema has keys that are not table columns"
	: never;

/**
 * Binds resources to tables and checks at compile time that every table row
 * satisfies the contract's `select` schema: `defineTables<Resources>()({ tasks, ... })`.
 */
export function defineTables<T extends AnyResources>() {
	return <const TTables extends CrudTables<T>>(
		tables: TTables & {
			[R in ResourceName<T>]: TableBinding<T[R]["select"], TTables[R]>;
		},
	): TTables => tables;
}

export interface CrudEngineOptions<T extends AnyResources, TContext> {
	db: unknown;
	resources: T;
	tables: CrudTables<T>;
	policies?: CrudPolicies<T, TContext>;
}

const and = (...filters: (Filter | undefined)[]): Filter => {
	const defined = filters.filter(
		(filter): filter is Filter =>
			filter !== undefined && Object.keys(filter).length > 0,
	);
	if (defined.length === 0) return {};
	if (defined.length === 1) return defined[0] as Filter;
	return { AND: defined };
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export function createCrudEngine<const T extends AnyResources, TContext>(
	options: CrudEngineOptions<T, TContext>,
) {
	const db = options.db as CrudDatabase;
	const policies = (options.policies ?? {}) as Record<
		string,
		ResourcePolicy<TContext> | undefined
	>;
	const tablesConfig = db._.relations;
	const resolved = new Map<string, ResolvedResource>();

	const tables = options.tables as Record<string, Table>;
	for (const [name, config] of Object.entries(options.resources)) {
		const table = tables[name];
		if (!table) throw new Error(`CRUD resource "${name}" has no table binding`);

		const entry = Object.entries(tablesConfig).find(
			([, tableConfig]) => tableConfig.table === table,
		);
		if (!entry) {
			throw new Error(
				`CRUD resource "${name}": table is not part of the Drizzle relations config`,
			);
		}

		const [key, tableConfig] = entry;
		const tableColumns = getTableColumns(table);
		const unknownColumns = Object.keys(config.select.shape).filter(
			(column) => !(column in tableColumns),
		);
		if (unknownColumns.length > 0 || !tableColumns.id) {
			throw new Error(
				`CRUD resource "${name}": select keys [${unknownColumns.join(", ")}] are not columns of "${key}", or it has no id column`,
			);
		}
		const foreignKeys: ForeignKey[] = [];
		for (const [relation, relationConfig] of Object.entries(config.relations)) {
			const drizzleRelation = tableConfig.relations[relation];
			if (!drizzleRelation) {
				throw new Error(
					`CRUD resource "${name}": "${relation}" is not a Drizzle relation of "${key}"`,
				);
			}

			const [source] =
				drizzleRelation.sourceColumns as unknown as RelationColumn[];
			const [targetColumn] =
				drizzleRelation.targetColumns as unknown as RelationColumn[];
			if (
				relationConfig.many ||
				drizzleRelation.sourceColumns.length !== 1 ||
				!source ||
				!targetColumn
			) {
				continue;
			}

			const sourceKey = columnKey(table, source._.column);
			const targetKey = columnKey(
				drizzleRelation.targetTable as Table,
				targetColumn._.column,
			);
			if (sourceKey && targetKey) {
				foreignKeys.push({
					relation,
					resource: relationConfig.resource,
					sourceKey,
					targetKey,
				});
			}
		}

		resolved.set(name, {
			name,
			config,
			table,
			key,
			idColumn: tableColumns.id,
			relations: tableConfig.relations,
			columns: Object.fromEntries(
				Object.keys(config.select.shape).map((column) => [
					column,
					true as const,
				]),
			),
			foreignKeys,
		});
	}

	function resource(name: string) {
		const found = resolved.get(name);
		if (!found)
			throw new ORPCError("BAD_REQUEST", {
				message: `Unknown resource "${name}"`,
			});
		return found;
	}

	function queryTable(executor: CrudDatabase, target: ResolvedResource) {
		return executor.query[target.key] as QueryTable;
	}

	async function authorize(
		target: ResolvedResource,
		operation: CrudOperation,
		context: TContext,
	) {
		if (!target.config.operations.includes(operation)) {
			throw new ORPCError("FORBIDDEN", {
				message: `"${operation}" is not enabled for resource "${target.name}"`,
			});
		}

		const check = policies[target.name]?.can?.[operation];
		if (check && !(await check(context))) throw new ORPCError("FORBIDDEN");
	}

	function baseFilter(
		target: ResolvedResource,
		context: TContext,
		deleted: "exclude" | "include" | "only" = "exclude",
	) {
		const softDelete = target.config.softDelete?.field;
		const scope = policies[target.name]?.scope?.(context);
		if (!softDelete || deleted === "include") return and(scope);

		return and(scope, {
			[softDelete]: deleted === "only" ? { isNotNull: true } : { isNull: true },
		});
	}

	function buildWith(
		target: ResolvedResource,
		withArg: Filter | undefined,
		context: TContext,
	): Row | undefined {
		if (!withArg) return undefined;

		const result: Row = {};
		for (const [relation, value] of Object.entries(withArg)) {
			if (!value) continue;

			const relationConfig = target.config.relations[relation];
			if (!relationConfig) continue;

			const related = resource(relationConfig.resource);
			const options = (value === true ? {} : value) as Filter;
			const nested: Row = { columns: related.columns };
			const nestedWith = buildWith(
				related,
				options.with as Filter | undefined,
				context,
			);
			if (nestedWith) nested.with = nestedWith;

			// The target's scope and soft delete apply to joined rows too; a hidden `one` target comes back as null.
			const where = and(
				relationConfig.many ? (options.where as Filter | undefined) : undefined,
				baseFilter(related, context),
			);
			if (Object.keys(where).length > 0) nested.where = where;
			if (relationConfig.many) {
				if (options.orderBy) nested.orderBy = options.orderBy;
				if (options.limit) nested.limit = options.limit;
			}

			result[relation] = nested;
		}

		return result;
	}

	function toSQL(target: ResolvedResource, where: Filter) {
		const built = relationsFilterToSQL(
			target.table,
			where as never,
			target.relations,
			tablesConfig,
			undefined,
		);
		return built.sql ? new SQL(built.sql) : undefined;
	}

	async function findOne(
		executor: CrudDatabase,
		target: ResolvedResource,
		id: string,
		context: TContext,
		withArg?: Filter,
		deleted: "exclude" | "include" | "only" = "exclude",
	) {
		const row = await queryTable(executor, target).findFirst({
			columns: target.columns,
			where: and({ id }, baseFilter(target, context, deleted)),
			with: buildWith(target, withArg, context),
		});
		if (!row) throw new ORPCError("NOT_FOUND");
		return row;
	}

	async function scopedIds(
		executor: CrudDatabase,
		target: ResolvedResource,
		ids: string[],
		context: TContext,
	) {
		const rows = await queryTable(executor, target).findMany({
			columns: { id: true },
			where: and({ id: { in: ids } }, baseFilter(target, context)),
		});
		return rows.map((row) => row.id as string);
	}

	async function assertReferences(
		executor: CrudDatabase,
		target: ResolvedResource,
		rows: Row[],
		context: TContext,
	) {
		for (const foreignKey of target.foreignKeys) {
			const related = resource(foreignKey.resource);
			const visibility = baseFilter(related, context);
			if (Object.keys(visibility).length === 0) continue;

			const values = [
				...new Set(
					rows
						.map((row) => row[foreignKey.sourceKey])
						.filter((value) => value !== undefined && value !== null),
				),
			];
			if (values.length === 0) continue;

			const found = await queryTable(executor, related).findMany({
				columns: { [foreignKey.targetKey]: true },
				where: and({ [foreignKey.targetKey]: { in: values } }, visibility),
			});
			if (found.length !== values.length) {
				throw new ORPCError("BAD_REQUEST", {
					message: `"${foreignKey.relation}" references a record that does not exist`,
				});
			}
		}
	}

	async function prepareCreate(
		executor: CrudDatabase,
		target: ResolvedResource,
		data: Row,
		context: TContext,
	) {
		await assertReferences(executor, target, [data], context);
		const hook = policies[target.name]?.beforeCreate;
		return hook ? hook(data, context) : data;
	}

	async function prepareUpdate(
		executor: CrudDatabase,
		target: ResolvedResource,
		data: Row,
		context: TContext,
	) {
		await assertReferences(executor, target, [data], context);
		const hook = policies[target.name]?.beforeUpdate;
		return hook ? hook(data, context) : data;
	}

	const idEquals = (target: ResolvedResource, ids: string[]) =>
		inArray(target.idColumn as never, ids);

	return {
		async list(
			input: CrudInputs<T>["list"],
			context: TContext,
		): Promise<ListOutput<Row>> {
			const target = resource(input.resource);
			await authorize(target, "list", context);

			const query = (input.query ?? {}) as Filter;
			const page = (query.page as number | undefined) ?? 1;
			const limit = (query.limit as number | undefined) ?? 20;
			const search = query.search as string | undefined;
			const searchable = target.config.searchable;

			const where = and(
				query.where as Filter | undefined,
				baseFilter(target, context, query.withDeleted ? "include" : "exclude"),
				search && searchable.length > 0
					? {
							OR: searchable.map((field) => ({
								[field]: { ilike: `%${escapeLike(search)}%` },
							})),
						}
					: undefined,
			);

			const [items, total] = await Promise.all([
				queryTable(db, target).findMany({
					columns: target.columns,
					where,
					with: buildWith(target, query.with as Filter | undefined, context),
					orderBy: query.orderBy ?? target.config.defaultOrderBy,
					limit,
					offset: (page - 1) * limit,
				}),
				db.$count(target.table, toSQL(target, where)),
			]);

			const totalPages = Math.ceil(total / limit);
			return {
				items,
				meta: {
					page,
					limit,
					total,
					totalPages,
					hasNextPage: page < totalPages,
					hasPreviousPage: page > 1,
				},
			};
		},

		async get(input: CrudInputs<T>["get"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "get", context);
			return findOne(
				db,
				target,
				input.id,
				context,
				input.with as Filter | undefined,
			);
		},

		async create(input: CrudInputs<T>["create"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "create", context);

			const values = await prepareCreate(
				db,
				target,
				input.data as Row,
				context,
			);
			const [created] = await db
				.insert(target.table)
				.values(values)
				.returning({ id: target.idColumn });
			if (!created) throw new Error(`Failed to create ${target.name}`);

			return findOne(
				db,
				target,
				created.id as string,
				context,
				input.with as Filter | undefined,
			);
		},

		async update(input: CrudInputs<T>["update"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "update", context);

			await db.transaction(async (tx) => {
				await findOne(tx, target, input.id, context);
				const values = await prepareUpdate(
					tx,
					target,
					input.data as Row,
					context,
				);
				await tx
					.update(target.table)
					.set(values)
					.where(idEquals(target, [input.id]));
			});

			return findOne(
				db,
				target,
				input.id,
				context,
				input.with as Filter | undefined,
			);
		},

		async delete(input: CrudInputs<T>["delete"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "delete", context);

			await db.transaction(async (tx) => {
				await findOne(tx, target, input.id, context);
				await removeByIds(tx, target, [input.id]);
			});

			return { id: input.id };
		},

		async restore(input: CrudInputs<T>["restore"], context: TContext) {
			const target = resource(input.resource);
			const softDelete = target.config.softDelete?.field;
			if (!softDelete) {
				throw new ORPCError("BAD_REQUEST", {
					message: `Resource "${target.name}" does not use soft delete`,
				});
			}
			await authorize(target, "restore", context);

			await db.transaction(async (tx) => {
				await findOne(tx, target, input.id, context, undefined, "only");
				await tx
					.update(target.table)
					.set({ [softDelete]: null })
					.where(idEquals(target, [input.id]));
			});

			return findOne(db, target, input.id, context);
		},

		async createMany(input: CrudInputs<T>["createMany"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "createMany", context);

			const rows = input.data as Row[];
			await assertReferences(db, target, rows, context);
			const hook = policies[target.name]?.beforeCreate;
			const values = hook
				? await Promise.all(rows.map((data) => hook(data, context)))
				: rows;
			const created = await db
				.insert(target.table)
				.values(values)
				.returning({ id: target.idColumn });
			const ids = created.map((row) => row.id as string);

			const items = await queryTable(db, target).findMany({
				columns: target.columns,
				where: and({ id: { in: ids } }, baseFilter(target, context)),
			});
			return { items };
		},

		async updateMany(input: CrudInputs<T>["updateMany"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "updateMany", context);

			const ids = await db.transaction(async (tx) => {
				const allowed = await scopedIds(tx, target, input.ids, context);
				if (allowed.length > 0) {
					const values = await prepareUpdate(
						tx,
						target,
						input.data as Row,
						context,
					);
					await tx
						.update(target.table)
						.set(values)
						.where(idEquals(target, allowed));
				}
				return allowed;
			});

			return { ids };
		},

		async deleteMany(input: CrudInputs<T>["deleteMany"], context: TContext) {
			const target = resource(input.resource);
			await authorize(target, "deleteMany", context);

			const ids = await db.transaction(async (tx) => {
				const allowed = await scopedIds(tx, target, input.ids, context);
				if (allowed.length > 0) await removeByIds(tx, target, allowed);
				return allowed;
			});

			return { ids };
		},
	};

	async function removeByIds(
		executor: CrudDatabase,
		target: ResolvedResource,
		ids: string[],
	) {
		const softDelete = target.config.softDelete?.field;
		if (softDelete) {
			await executor
				.update(target.table)
				.set({ [softDelete]: new Date() })
				.where(idEquals(target, ids));
			return;
		}

		await executor.delete(target.table).where(idEquals(target, ids));
	}
}

export type CrudEngine<T extends AnyResources, TContext> = ReturnType<
	typeof createCrudEngine<T, TContext>
>;
