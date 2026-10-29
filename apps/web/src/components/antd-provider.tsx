import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import type { PropsWithChildren } from "react";

export function AntdProvider({ children }: PropsWithChildren) {
	return (
		<ConfigProvider
			locale={viVN}
			theme={{
				token: {
					borderRadius: 2,
					fontFamily: "var(--font-sans)",
				},
			}}
		>
			<App message={{ maxCount: 3 }}>{children}</App>
		</ConfigProvider>
	);
}
