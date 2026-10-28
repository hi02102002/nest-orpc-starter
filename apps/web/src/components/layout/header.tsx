import { Flex, Space } from "antd";
import UserMenu from "@/components/user-menu";

export default function Header() {
	return (
		<header className="sticky top-0 z-20 border-b border-[rgb(128_102_80/20%)] bg-[color-mix(in_srgb,Canvas_88%,transparent)] px-[clamp(18px,4vw,56px)] py-3.5 backdrop-blur-[18px] max-sm:px-4 max-sm:py-3">
			<Flex align="center" justify="flex-end" gap="large">
				<Space>
					<div className="w-32">
						<UserMenu />
					</div>
				</Space>
			</Flex>
		</header>
	);
}
