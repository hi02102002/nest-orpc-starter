import type { CrudResources } from "@app/api-contract";
import { definePolicies } from "@app/crud/server";
import { ORPCError } from "@orpc/server";

import type { Auth } from "@/services.module";

export interface CrudContext {
	session: Auth["$Infer"]["Session"] | null;
}

export const isAuthenticated = (context: CrudContext) =>
	context.session !== null;

/** Narrows the session in policies that also serve public operations. */
export function requireUser(context: CrudContext) {
	if (!context.session) throw new ORPCError("UNAUTHORIZED");
	return context.session.user;
}

// Per-resource scope (tenancy), permission checks, write hooks and public (anonymous) operations.
export const crudPolicies = definePolicies<CrudResources, CrudContext>({
	users: { public: ["list", "get"] },
});
