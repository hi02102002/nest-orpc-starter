import { Link, useNavigate } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { App, Button, Dropdown, Skeleton } from "antd";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const { message } = App.useApp();
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton.Button active block />;
	}

	if (!session) {
		return (
			<Link to="/login" className="block">
				<Button block>Sign In</Button>
			</Link>
		);
	}

	const items: MenuProps["items"] = [
		{ key: "account", label: "My account", type: "group" },
		{ key: "email", label: session.user.email, disabled: true },
		{ type: "divider" },
		{ key: "sign-out", label: "Sign out", danger: true },
	];

	return (
		<Dropdown
			placement="bottomRight"
			trigger={["click"]}
			menu={{
				items,
				onClick: ({ key }) => {
					if (key !== "sign-out") {
						return;
					}

					authClient.signOut({
						fetchOptions: {
							onSuccess: () => {
								message.success("Signed out");
								navigate({ to: "/" });
							},
							onError: () => {
								message.error("Unable to sign out");
							},
						},
					});
				},
			}}
		>
			<Button block>
				<span className="block truncate">{session.user.name}</span>
			</Button>
		</Dropdown>
	);
}
