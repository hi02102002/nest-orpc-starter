import type { AppRouterClient, CrudResources } from "@app/api-contract";
import { contract } from "@app/api-contract";
import { createCrudUtils } from "@app/crud/client";
import { createORPCClient } from "@orpc/client";
import { DedupeLinkPlugin } from "@orpc/client/plugins";
import { SmartCoercionLinkPlugin } from "@orpc/json-schema";
import { OpenAPILink } from "@orpc/openapi/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { ENV } from "../env";

const toStandardHeaders = (headers: HeadersInit | undefined): Headers => {
	const standardHeaders = new Headers();

	if (headers) {
		if (headers instanceof Headers) {
			headers.forEach((value, key) => {
				standardHeaders.append(key, value);
			});
		} else if (Array.isArray(headers)) {
			headers.forEach(([key, value]) => {
				standardHeaders.append(key, value);
			});
		} else {
			Object.entries(headers).forEach(([key, value]) => {
				if (value !== undefined) {
					standardHeaders.append(key, value);
				}
			});
		}
	}

	return standardHeaders;
};

const cookieHeaders = (cookie: string | null): HeadersInit | undefined =>
	cookie ? { cookie } : undefined;

function createUtils(client: AppRouterClient) {
	const utils = createTanstackQueryUtils(client);

	return { ...utils, crud: createCrudUtils<CrudResources>(utils.crud) };
}

const getLink = ({
	origin,
	hds,
	dedupe = false,
}: {
	origin: string;
	hds?: HeadersInit;
	dedupe?: boolean;
}) => {
	return new OpenAPILink(contract, {
		origin: origin.replace(/\/$/, ""),
		fetch(url, options) {
			const headers = toStandardHeaders(options?.headers);
			toStandardHeaders(hds).forEach((value, key) => {
				headers.set(key, value);
			});

			return fetch(url, {
				...options,
				credentials: "include",
				headers,
			});
		},
		plugins: [
			new SmartCoercionLinkPlugin(contract, {
				converters: [new ZodToJsonSchemaConverter()],
			}),
			...(dedupe
				? [
					new DedupeLinkPlugin({
						groups: [{ condition: () => true, context: {} }],
					}),
				]
				: []),
		],
	});
};

export const getOrpc = createIsomorphicFn()
	.client(() => {
		const client: AppRouterClient = createORPCClient(
			getLink({
				origin: ENV.VITE_SERVER_URL,
				dedupe: true,
			}),
		);

		return createUtils(client);
	})
	.server(() => {
		const client: AppRouterClient = createORPCClient(
			getLink({
				origin: ENV.SERVER_URL ?? ENV.VITE_SERVER_URL,
				hds: cookieHeaders(getRequestHeaders().get("cookie")),
			}),
		);

		return createUtils(client);
	});

export type OrpcUtils = ReturnType<typeof getOrpc>;
