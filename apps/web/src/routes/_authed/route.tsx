import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/app-layout";
import { authClient } from "@/lib/auth-client";
import { getSidebarCollapsed } from "@/stores/sidebar-store";

export const Route = createFileRoute("/_authed")({
	component: AuthedLayout,
	beforeLoad: async ({ location }) => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		return { session };
	},
	loader: () => ({ sidebarCollapsed: getSidebarCollapsed() }),
});

function AuthedLayout() {
	const { sidebarCollapsed } = Route.useLoaderData();

	return (
		<AppLayout sidebarCollapsed={sidebarCollapsed}>
			<Outlet />
		</AppLayout>
	);
}
