import type { RouterContractClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";

import { healthCheckContract } from "./health.contract";
import { privateDataContract } from "./private-data.contract";

export const contract = {
	healthCheck: healthCheckContract,
	privateData: privateDataContract,
};

export type AppRouterClient = JsonifiedClient<
	RouterContractClient<typeof contract>
>;
