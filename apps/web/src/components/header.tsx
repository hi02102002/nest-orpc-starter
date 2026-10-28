import { Link } from "@tanstack/react-router";
import { Flex, Space, Typography } from "antd";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<header className="app-header">
			<Flex align="center" justify="space-between" gap="large">
				<Space size="large" align="center">
					<Typography.Text
						strong
						className="inline-block! text-[1.1rem]! leading-none! font-semibold! tracking-[0.08em]! whitespace-nowrap uppercase max-sm:hidden!"
					>
						Petshop
					</Typography.Text>
					<nav className="app-nav" aria-label="Primary navigation">
						{links.map(({ to, label }) => {
							return (
								<Link key={to} to={to} activeProps={{ className: "active" }}>
									{label}
								</Link>
							);
						})}
					</nav>
				</Space>
				<Space>
					<ModeToggle />
					<div className="w-32">
						<UserMenu />
					</div>
				</Space>
			</Flex>
		</header>
	);
}
