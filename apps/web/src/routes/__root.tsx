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
import { ThemeProvider } from "@/components/theme-provider";
import type { OrpcUtils } from "@/utils/orpc";

import appCss from "../index.css?url";

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
			<ThemeProvider
				attribute="class"
				defaultTheme="system"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<AntdProvider>
					<Outlet />
				</AntdProvider>
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className="bg-[#f4efe7] scheme-light dark:bg-[#15120f] dark:scheme-dark"
		>
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen min-w-80 bg-[image:radial-gradient(circle_at_15%_0%,rgb(196_102_47/14%),transparent_34rem),linear-gradient(180deg,rgb(255_255_255/40%),transparent_28rem)]">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
