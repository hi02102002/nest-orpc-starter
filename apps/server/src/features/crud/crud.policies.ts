import type { CrudResources } from "@petshop/api-contract";
import { definePolicies } from "@petshop/crud/server";

import type { Auth } from "@/services.module";

export interface CrudContext {
	session: Auth["$Infer"]["Session"];
}

// Per-resource scope (tenancy), permission checks and write hooks.
export const crudPolicies = definePolicies<CrudResources, CrudContext>({});
