import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (session.data) {
			throw redirect({
				to: "/",
			});
		}
	},
});

function AuthLayout() {
	return (
		<div className="grid min-h-screen place-items-center bg-[#3b2f25] bg-[image:linear-gradient(rgb(0_0_0/15%),rgb(0_0_0/15%)),url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80)] bg-cover bg-center bg-no-repeat p-4">
			<Outlet />
		</div>
	);
}
