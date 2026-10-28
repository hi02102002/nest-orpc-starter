import { createCrudContract } from "@app/crud";
import type { RouterContractClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";

import { crudResources } from "./crud.resources";
import { healthCheckContract } from "./health.contract";
import { privateDataContract } from "./private-data.contract";

export const contract = {
	crud: createCrudContract(crudResources),
	healthCheck: healthCheckContract,
	privateData: privateDataContract,
};

export type AppRouterClient = JsonifiedClient<
	RouterContractClient<typeof contract>
>;

export { type CrudResources, crudResources } from "./crud.resources";
