import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppLayout } from "@/components/layout/app-layout";
import { getSidebarCollapsed } from "@/stores/sidebar-store";

export const Route = createFileRoute("/_authed")({
	component: AuthedLayout,
	beforeLoad: ({ context, location }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}
		return { session: context.session };
	},
	loader: () => ({ sidebarCollapsed: getSidebarCollapsed() }),
	ssr: false,
});

function AuthedLayout() {
	const { sidebarCollapsed } = Route.useLoaderData();

	return (
		<AppLayout sidebarCollapsed={sidebarCollapsed}>
			<Outlet />
		</AppLayout>
	);
}
