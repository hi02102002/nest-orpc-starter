import { useNavigate, useRouteContext } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Avatar, Dropdown, Tooltip, Typography } from "antd";
import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react";

import { useSignOut } from "@/hooks/use-sign-out";
import { isAdmin } from "@/lib/auth-client";

interface SidebarUserProps {
	collapsed: boolean;
}

export function SidebarUser({ collapsed }: SidebarUserProps) {
	const { session } = useRouteContext({ from: "__root__" });
	const signOut = useSignOut();
	const navigate = useNavigate();
	const user = session?.user;

	if (!user) return null;

	const items: MenuProps["items"] = [
		{
			key: "account",
			type: "group",
			label: isAdmin(user) ? "Quản trị viên" : "Người dùng",
		},
		{
			key: "change-password",
			icon: <KeyRound size={16} />,
			label: "Đổi mật khẩu",
			onClick: () => navigate({ to: "/account/password" }),
		},
		{ type: "divider" },
		{
			key: "sign-out",
			icon: <LogOut size={16} />,
			label: "Đăng xuất",
			danger: true,
			onClick: signOut,
		},
	];

	const avatar = (
		<Avatar src={user.image ?? undefined} className="shrink-0">
			{user.name.charAt(0).toUpperCase()}
		</Avatar>
	);

	return (
		<div className="p-2">
			<Dropdown
				menu={{ items }}
				trigger={["click"]}
				placement={collapsed ? "topLeft" : "top"}
			>
				<button
					type="button"
					className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent p-2 text-start transition-colors hover:bg-black/5"
				>
					{collapsed ? (
						<Tooltip title={user.name} placement="right">
							<span className="mx-auto">{avatar}</span>
						</Tooltip>
					) : (
						<>
							{avatar}
							<span className="min-w-0 flex-1">
								<Typography.Text strong ellipsis className="block!">
									{user.name}
								</Typography.Text>
								<Typography.Text
									type="secondary"
									ellipsis
									className="block! text-xs!"
								>
									{user.email}
								</Typography.Text>
							</span>
							<ChevronsUpDown size={14} className="shrink-0 opacity-60" />
						</>
					)}
				</button>
			</Dropdown>
		</div>
	);
}
