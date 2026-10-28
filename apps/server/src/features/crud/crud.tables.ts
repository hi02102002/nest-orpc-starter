import type { CrudResources } from "@app/api-contract";
import { defineTables } from "@app/crud/server";
import { user } from "@app/db/schema/auth";

// Fails to compile if a contract `select` schema drifts from its table.
export const crudTables = defineTables<CrudResources>()({
	users: user,
});
