import { defineResource, defineResources } from "@app/crud";
import { z } from "zod";

// Contract-only shapes: the server binds them to Drizzle tables and type-checks the match.
export const crudResources = defineResources({
	// Public projection of Better Auth users: never writable, never exposes email or tokens.
	users: defineResource({
		select: z.object({
			id: z.string(),
			name: z.string(),
			image: z.string().nullable(),
		}),
		filterable: ["id", "name"],
		sortable: ["name"],
		searchable: ["name"],
		operations: ["list", "get"],
	}),
});

export type CrudResources = typeof crudResources;
