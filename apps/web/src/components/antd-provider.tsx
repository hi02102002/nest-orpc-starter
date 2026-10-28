import { App, ConfigProvider, theme } from "antd";
import type { PropsWithChildren } from "react";

import { useTheme } from "./theme-provider";

export function AntdProvider({ children }: PropsWithChildren) {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	return (
		<ConfigProvider
			theme={{
				algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
				token: {
					borderRadius: 10,
					colorPrimary: "#c4662f",
					fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
				},
			}}
		>
			<App>{children}</App>
		</ConfigProvider>
	);
}
