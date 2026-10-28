import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@petshop/api-contract";
import { contract } from "@petshop/api-contract";

import { ENV } from "../env";

export function createOrpc() {
	const link = new OpenAPILink(contract, {
		origin: ENV.VITE_SERVER_URL.replace(/\/$/, ""),
		fetch(url, options) {
			return fetch(url, {
				...options,
				credentials: "include",
			});
		},
	});
	const client: AppRouterClient = createORPCClient(link);

	return createTanstackQueryUtils(client);
}

export type OrpcUtils = ReturnType<typeof createOrpc>;
