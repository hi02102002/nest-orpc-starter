import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { isAdmin } from "@/lib/auth-client";

export const Route = createFileRoute("/_authed/admin")({
	beforeLoad: ({ context }) => {
		if (!isAdmin(context.session.data?.user)) {
			throw redirect({ to: "/" });
		}
	},
	component: Outlet,
});
