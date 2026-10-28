import { Link, type LinkProps, useLocation } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Layout, Menu, Typography } from "antd";
import { Boxes, LayoutDashboard, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";

import { useSignOut } from "@/hooks/use-sign-out";
import { authClient, isAdmin } from "@/lib/auth-client";
import { useSidebarCollapsed, useSidebarStore } from "@/stores/sidebar-store";

type NavItem = {
	to: NonNullable<LinkProps["to"]>;
	label: string;
	icon: ReactNode;
	adminOnly?: boolean;
};

const navItems: NavItem[] = [
	{ to: "/", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
	{
		to: "/admin/users",
		label: "Người dùng",
		icon: <Users size={16} />,
		adminOnly: true,
	},
];

export function AppSidebar() {
	const collapsed = useSidebarCollapsed();
	const isMobile = useSidebarStore((state) => state.isMobile);
	const setCollapsed = useSidebarStore((state) => state.setCollapsed);
	const setIsMobile = useSidebarStore((state) => state.setIsMobile);
	const pathname = useLocation({ select: (location) => location.pathname });
	const { data: session } = authClient.useSession();
	const admin = isAdmin(session?.user);
	const signOut = useSignOut();

	const items: MenuProps["items"] = navItems
		.filter((item) => !item.adminOnly || admin)
		.map(({ to, label, icon }) => ({
			key: to,
			icon,
			label: <Link to={to}>{label}</Link>,
		}));

	return (
		<Layout.Sider
			theme="light"
			width={232}
			breakpoint="lg"
			collapsible
			collapsed={collapsed}
			collapsedWidth={isMobile ? 0 : 72}
			onCollapse={(value, type) => {
				if (type === "clickTrigger") {
					setCollapsed(value);
				}
			}}
			onBreakpoint={setIsMobile}
			className="sticky! top-0 z-30 h-screen border-e border-[rgb(128_102_80/20%)] [&_.ant-layout-sider-children]:flex [&_.ant-layout-sider-children]:flex-col [&_.ant-layout-sider-children]:overflow-y-auto [&_.ant-layout-sider-trigger]:border-e [&_.ant-layout-sider-trigger]:border-[rgb(128_102_80/20%)]"
		>
			<div className="flex h-[61px] items-center gap-2.5 px-6">
				<Boxes size={20} className="shrink-0" />
				{!collapsed && (
					<Typography.Text
						strong
						className="text-[1.1rem]! leading-none! font-semibold! tracking-[0.08em]! whitespace-nowrap text-inherit! uppercase"
					>
						Starter
					</Typography.Text>
				)}
			</div>
			<Menu
				theme="light"
				mode="inline"
				selectedKeys={[pathname]}
				items={items}
				className="flex-1 border-e-0!"
				onClick={() => {
					if (isMobile) {
						setCollapsed(true);
					}
				}}
			/>
			<Menu
				theme="light"
				mode="inline"
				selectable={false}
				items={[
					{
						key: "sign-out",
						icon: <LogOut size={16} />,
						label: "Đăng xuất",
						danger: true,
						onClick: signOut,
					},
				]}
				className="border-e-0! border-t border-[rgb(128_102_80/20%)]"
			/>
		</Layout.Sider>
	);
}
