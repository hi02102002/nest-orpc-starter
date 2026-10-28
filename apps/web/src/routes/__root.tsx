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
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import type { OrpcUtils } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
	orpc: OrpcUtils;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
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
				title: "petshop",
			},
			{
				name: "description",
				content: "petshop is a web application",
			},
		],
		links: [
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
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<AntdProvider>
					<div className="app-shell">
						<Header />
						<main className="app-content">
							<Outlet />
						</main>
					</div>
				</AntdProvider>
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
