import { App, ConfigProvider } from "antd";
import type { PropsWithChildren } from "react";

export function AntdProvider({ children }: PropsWithChildren) {
	return (
		<ConfigProvider
			theme={{
				token: {
					borderRadius: 4,
					fontFamily: "var(--font-sans)",
				},
			}}
		>
			<App>{children}</App>
		</ConfigProvider>
	);
}
