import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@petshop/api-contract";
import { contract } from "@petshop/api-contract";

import { ENV } from "../env";

export function createOrpc() {
	const origin = import.meta.env.SSR
		? (ENV.SERVER_URL ?? ENV.VITE_SERVER_URL)
		: ENV.VITE_SERVER_URL;
	const link = new OpenAPILink(contract, {
		origin: origin.replace(/\/$/, ""),
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
