import { App, ConfigProvider } from "antd";
import type { PropsWithChildren } from "react";

export function AntdProvider({ children }: PropsWithChildren) {
	return (
		<ConfigProvider
			theme={{
				token: {
					borderRadius: 0,
					fontFamily: '"Avenir Next", Avenir, "Segoe UI", sans-serif',
				},
			}}
		>
			<App>{children}</App>
		</ConfigProvider>
	);
}
