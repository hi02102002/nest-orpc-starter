import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import type { PropsWithChildren } from "react";

export function AntdProvider({ children }: PropsWithChildren) {
	return (
		<ConfigProvider
			// Vietnamese built-in texts (empty state, pagination, pickers); dayjs uses "vi" too.
			locale={viVN}
			theme={{
				token: {
					borderRadius: 2,
					fontFamily: "var(--font-sans)",
				},
			}}
		>
			<App>{children}</App>
		</ConfigProvider>
	);
}
