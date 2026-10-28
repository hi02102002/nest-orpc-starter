import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@petshop/api-contract";
import { contract } from "@petshop/api-contract";
import { QueryClient } from "@tanstack/react-query";

import { ENV } from "../env";

export function createQueryClient() {
	return new QueryClient();
}

export const queryClient = createQueryClient();

export const link = new OpenAPILink(contract, {
	origin: ENV.VITE_SERVER_URL.replace(/\/$/, ""),
	fetch(url, options) {
		return fetch(url, {
			...options,
			credentials: "include",
		});
	},
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
