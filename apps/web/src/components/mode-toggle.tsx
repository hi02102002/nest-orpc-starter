import { Button, Dropdown } from "antd";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<Dropdown
			placement="bottomRight"
			trigger={["click"]}
			menu={{
				selectedKeys: [resolvedTheme ?? "system"],
				items: [
					{ key: "light", label: "Light" },
					{ key: "dark", label: "Dark" },
					{ key: "system", label: "System" },
				],
				onClick: ({ key }) => setTheme(key),
			}}
		>
			<Button
				aria-label="Toggle color theme"
				icon={resolvedTheme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
			/>
		</Dropdown>
	);
}
