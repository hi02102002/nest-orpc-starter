import { useNavigate } from "@tanstack/react-router";
import { App } from "antd";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
	const { message } = App.useApp();
	const navigate = useNavigate();

	return () =>
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					message.success("Đã đăng xuất");
					navigate({ to: "/login" });
				},
				onError: () => {
					message.error("Không thể đăng xuất");
				},
			},
		});
}
