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
		<header className="sticky top-0 z-20 border-b border-[rgb(128_102_80/20%)] bg-[color-mix(in_srgb,Canvas_88%,transparent)] px-[clamp(18px,4vw,56px)] py-3.5 backdrop-blur-[18px] max-sm:px-4 max-sm:py-3">
			<Flex align="center" justify="space-between" gap="large">
				<Space size="large" align="center">
					<Typography.Text
						strong
						className="inline-block! text-[1.1rem]! leading-none! font-semibold! tracking-[0.08em]! whitespace-nowrap uppercase max-sm:hidden!"
					>
						Petshop
					</Typography.Text>
					<nav className="flex gap-[18px]" aria-label="Primary navigation">
						{links.map(({ to, label }) => {
							return (
								<Link
									key={to}
									to={to}
									className="text-inherit no-underline opacity-62 hover:opacity-100 data-[status=active]:opacity-100"
								>
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
