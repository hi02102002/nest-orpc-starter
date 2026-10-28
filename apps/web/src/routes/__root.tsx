import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

import { AntdProvider } from "@/components/antd-provider";
import { sessionQueryOptions } from "@/lib/session";
import type { OrpcUtils } from "@/utils/orpc";

import appCss from "../index.css?url";

export interface RouterAppContext {
	orpc: OrpcUtils;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	beforeLoad: async ({ context }) => ({
		session: await context.queryClient.fetchQuery(sessionQueryOptions),
	}),
	component: RootComponent,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "App",
			},
			{
				name: "description",
				content: "Full-stack NestJS + oRPC starter",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	return (
		<RootDocument>
			<AntdProvider>
				<Outlet />
			</AntdProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" className="bg-gray-50">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
