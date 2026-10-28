import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";
import { getOrpc } from "./utils/orpc";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});
	const orpc = getOrpc();
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		scrollRestoration: true,
		context: { orpc, queryClient },
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
