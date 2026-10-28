import { createORPCClient } from "@orpc/client";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@petshop/api-contract";
import { contract } from "@petshop/api-contract";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { ENV } from "../env";

export const getOrpc = createIsomorphicFn()
	.client(() => {
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
	})
	.server(() => {
		const origin = ENV.SERVER_URL ?? ENV.VITE_SERVER_URL;
		const hds = getRequestHeaders();
		const link = new OpenAPILink(contract, {
			origin: origin.replace(/\/$/, ""),
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
					headers: {
						...hds,
					},
				});
			},
		});
		const client: AppRouterClient = createORPCClient(link);

		return createTanstackQueryUtils(client);
	});

export type OrpcUtils = ReturnType<typeof getOrpc>;
