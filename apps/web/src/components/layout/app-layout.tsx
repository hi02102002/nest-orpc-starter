import { Layout } from "antd";
import type { PropsWithChildren } from "react";

import { SidebarStoreProvider } from "@/stores/sidebar-store";

import { AppSidebar } from "./app-sidebar";
import Header from "./header";

interface AppLayoutProps extends PropsWithChildren {
	sidebarCollapsed: boolean;
}

export function AppLayout({ sidebarCollapsed, children }: AppLayoutProps) {
	return (
		<SidebarStoreProvider initialCollapsed={sidebarCollapsed}>
			<Layout hasSider className="min-h-screen bg-transparent!">
				<AppSidebar />
				<Layout className="min-w-0 bg-transparent!">
					<Header />
					<Layout.Content className="p-[clamp(16px,3vw,32px)]">
						{children}
					</Layout.Content>
				</Layout>
			</Layout>
		</SidebarStoreProvider>
	);
}
