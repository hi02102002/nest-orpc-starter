import { queryOptions } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { ENV } from "../env";
import { authClient } from "./auth-client";

export type Session = typeof authClient.$Infer.Session;

export const getSession = createIsomorphicFn()
	.server(async (): Promise<{ data: Session | null }> => {
		const cookie = getRequestHeaders().get("cookie");
		if (!cookie) return { data: null };

		const origin = (ENV.SERVER_URL ?? ENV.VITE_SERVER_URL).replace(/\/$/, "");
		try {
			const response = await fetch(`${origin}/api/auth/get-session`, {
				headers: { cookie },
			});
			if (!response.ok) return { data: null };
			return { data: (await response.json()) as Session | null };
		} catch {
			return { data: null };
		}
	})
	.client(async () => {
		const { data } = await authClient.getSession();
		return { data };
	});

export const sessionQueryKey = ["session"] as const;

export const sessionQueryOptions = queryOptions({
	queryKey: sessionQueryKey,
	queryFn: async () => (await getSession()).data,
	staleTime: 60_000,
});
