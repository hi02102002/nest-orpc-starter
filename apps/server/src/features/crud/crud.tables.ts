import type { CrudResources } from "@petshop/api-contract";
import { defineTables } from "@petshop/crud/server";
import { user } from "@petshop/db/schema/auth";

// Fails to compile if a contract `select` schema drifts from its table.
export const crudTables = defineTables<CrudResources>()({
	users: user,
});
