import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

import type { AnyResources } from "./define";
import { createQuerySchemas } from "./query-schema";
import type { CrudInputs } from "./types";

const rowSchema = z.record(z.string(), z.unknown());

const listOutputSchema = z.object({
	items: z.array(rowSchema),
	meta: z.object({
		page: z.number().int(),
		limit: z.number().int(),
		total: z.number().int(),
		totalPages: z.number().int(),
		hasNextPage: z.boolean(),
		hasPreviousPage: z.boolean(),
	}),
});

const idsOutputSchema = z.object({ ids: z.array(z.string()) });

const idSchema = z.string().min(1);
const idsSchema = z.array(idSchema).min(1).max(500);

export const crudErrors = {
	UNAUTHORIZED: { message: "Authentication required" },
	FORBIDDEN: { message: "You are not allowed to perform this action" },
	NOT_FOUND: { message: "Record not found" },
	BAD_REQUEST: { message: "Invalid CRUD request" },
};

export function createCrudContract<const T extends AnyResources>(resources: T) {
	const { listQuerySchema, withSchema } = createQuerySchemas(resources);
	const names = Object.keys(resources);

	function byResource<TInput>(
		build: (name: string) => Record<string, z.ZodType>,
	) {
		const options = names.map((name) =>
			z.strictObject({ resource: z.literal(name), ...build(name) }),
		) as unknown as [z.ZodObject, ...z.ZodObject[]];

		return z.discriminatedUnion("resource", options) as unknown as z.ZodType<
			TInput,
			TInput
		>;
	}

	function optionalWith(name: string): Record<string, z.ZodType> {
		const schema = withSchema(name);
		return schema ? { with: schema.optional() } : {};
	}

	const base = oc.errors(crudErrors);
	// Every route is a JSON body call: `resource` lives in a discriminated union, which OpenAPI path params cannot source.
	const route = (path: string, successStatus?: number) =>
		openapi({
			method: "POST",
			path: `/api/crud/${path}`,
			tags: ["Crud"],
			...(successStatus ? { successStatus } : {}),
		});

	return {
		list: base
			.meta(route("list"))
			.input(
				byResource<CrudInputs<T>["list"]>((name) => ({
					query: listQuerySchema(name),
				})),
			)
			.output(listOutputSchema),
		get: base
			.meta(route("get"))
			.input(
				byResource<CrudInputs<T>["get"]>((name) => ({
					id: idSchema,
					...optionalWith(name),
				})),
			)
			.output(rowSchema),
		create: base
			.meta(route("create", 201))
			.input(
				byResource<CrudInputs<T>["create"]>((name) => ({
					data: resources[name]?.create as z.ZodObject,
					...optionalWith(name),
				})),
			)
			.output(rowSchema),
		update: base
			.meta(route("update"))
			.input(
				byResource<CrudInputs<T>["update"]>((name) => ({
					id: idSchema,
					data: resources[name]?.update as z.ZodObject,
					...optionalWith(name),
				})),
			)
			.output(rowSchema),
		delete: base
			.meta(route("delete"))
			.input(byResource<CrudInputs<T>["delete"]>(() => ({ id: idSchema })))
			.output(z.object({ id: z.string() })),
		restore: base
			.meta(route("restore"))
			.input(byResource<CrudInputs<T>["restore"]>(() => ({ id: idSchema })))
			.output(rowSchema),
		createMany: base
			.meta(route("create-many", 201))
			.input(
				byResource<CrudInputs<T>["createMany"]>((name) => ({
					data: z
						.array(resources[name]?.create as z.ZodObject)
						.min(1)
						.max(500),
				})),
			)
			.output(z.object({ items: z.array(rowSchema) })),
		updateMany: base
			.meta(route("update-many"))
			.input(
				byResource<CrudInputs<T>["updateMany"]>((name) => ({
					ids: idsSchema,
					data: resources[name]?.update as z.ZodObject,
				})),
			)
			.output(idsOutputSchema),
		deleteMany: base
			.meta(route("delete-many"))
			.input(
				byResource<CrudInputs<T>["deleteMany"]>(() => ({ ids: idsSchema })),
			)
			.output(idsOutputSchema),
	};
}

export type CrudContract<T extends AnyResources> = ReturnType<
	typeof createCrudContract<T>
>;
