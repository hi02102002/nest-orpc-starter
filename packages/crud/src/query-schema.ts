import { z } from "zod";

import type { AnyResources } from "./define";
import { MAX_RELATION_DEPTH } from "./types";

const WRAPPER_TYPES = new Set(["nullable", "optional", "default", "readonly"]);

/** Strip nullable/optional/default wrappers and coerce dates, which arrive as ISO strings over JSON. */
function filterValueSchema(schema: z.ZodType): z.ZodType {
	let current = schema;
	while (WRAPPER_TYPES.has(current.def.type)) {
		current = (current.def as unknown as { innerType: z.ZodType }).innerType;
	}

	// ISO string in (representable in JSON Schema / OpenAPI), Date out.
	return current.def.type === "date"
		? z
				.union([z.iso.datetime({ offset: true }), z.iso.date()])
				.pipe(z.coerce.date())
		: current;
}

function fieldFilterSchema(schema: z.ZodType) {
	const value = filterValueSchema(schema);

	return z.union([
		value,
		z.strictObject({
			eq: value.optional(),
			ne: value.optional(),
			gt: value.optional(),
			gte: value.optional(),
			lt: value.optional(),
			lte: value.optional(),
			in: z.array(value).optional(),
			notIn: z.array(value).optional(),
			like: z.string().optional(),
			ilike: z.string().optional(),
			notLike: z.string().optional(),
			notIlike: z.string().optional(),
			isNull: z.literal(true).optional(),
			isNotNull: z.literal(true).optional(),
		}),
	]);
}

export function createQuerySchemas(resources: AnyResources) {
	const whereCache = new Map<string, z.ZodType>();
	const withCache = new Map<string, z.ZodType | undefined>();

	function resourceOf(name: string) {
		const resource = resources[name];
		if (!resource) throw new Error(`Unknown CRUD resource "${name}"`);
		return resource;
	}

	function orderBySchema(name: string) {
		const direction = z.enum(["asc", "desc"]).optional();
		return z.strictObject(
			Object.fromEntries(
				resourceOf(name).sortable.map((field) => [field, direction]),
			),
		);
	}

	function whereSchema(name: string, depth = 0): z.ZodType {
		const key = `${name}:${depth}`;
		const cached = whereCache.get(key);
		if (cached) return cached;

		const resource = resourceOf(name);
		const self: z.ZodType = z.lazy(() => schema);
		const shape: Record<string, z.ZodType> = {
			AND: z.array(self).optional(),
			OR: z.array(self).optional(),
			NOT: self.optional(),
		};

		for (const field of resource.filterable) {
			const column = resource.select.shape[field] as z.ZodType;
			shape[field] = fieldFilterSchema(column).optional();
		}

		if (depth < MAX_RELATION_DEPTH) {
			for (const [relation, config] of Object.entries(resource.relations)) {
				shape[relation] = z
					.union([
						z.boolean(),
						z.lazy(() => whereSchema(config.resource, depth + 1)),
					])
					.optional();
			}
		}

		const schema = z.strictObject(shape);
		whereCache.set(key, schema);
		return schema;
	}

	function withSchema(name: string, depth = 0): z.ZodType | undefined {
		if (depth >= MAX_RELATION_DEPTH) return undefined;

		const key = `${name}:${depth}`;
		if (withCache.has(key)) return withCache.get(key);

		const shape: Record<string, z.ZodType> = {};
		for (const [relation, config] of Object.entries(
			resourceOf(name).relations,
		)) {
			const nested = withSchema(config.resource, depth + 1);
			const options: Record<string, z.ZodType> = nested
				? { with: nested.optional() }
				: {};

			if (config.many) {
				options.where = whereSchema(config.resource).optional();
				options.orderBy = orderBySchema(config.resource).optional();
				options.limit = z.number().int().min(1).max(100).optional();
			}

			shape[relation] = z
				.union([z.literal(true), z.strictObject(options)])
				.optional();
		}

		const schema =
			Object.keys(shape).length > 0 ? z.strictObject(shape) : undefined;
		withCache.set(key, schema);
		return schema;
	}

	function listQuerySchema(name: string) {
		const withArg = withSchema(name);

		return z
			.strictObject({
				where: whereSchema(name).optional(),
				orderBy: orderBySchema(name).optional(),
				...(withArg ? { with: withArg.optional() } : {}),
				search: z.string().trim().max(200).optional(),
				page: z.number().int().min(1).default(1),
				limit: z.number().int().min(1).max(100).default(20),
				withDeleted: z.boolean().optional(),
			})
			.prefault({});
	}

	return { listQuerySchema, orderBySchema, whereSchema, withSchema };
}
