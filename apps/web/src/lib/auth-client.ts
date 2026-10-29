import { queryOptions } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ENV } from "../env";

export const authClient = createAuthClient({
	baseURL: ENV.VITE_SERVER_URL,
	plugins: [adminClient()],
});

export const authErrorMessage = (error: {
	status: number;
	message?: string;
	statusText: string;
}) =>
	error.status === 429
		? "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ít phút."
		: error.message || error.statusText;

export const isAdmin = (user?: { role?: string | null } | null) =>
	user?.role?.split(",").includes("admin") ?? false;

export const authFetchOptions = createIsomorphicFn()
	.server(() => {
		const cookie = getRequestHeaders().get("cookie");
		const origin = (ENV.SERVER_URL ?? ENV.VITE_SERVER_URL).replace(/\/$/, "");
		return {
			baseURL: `${origin}/api/auth`,
			headers: cookie ? { cookie } : undefined,
		};
	})
	.client(() => ({}));

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
