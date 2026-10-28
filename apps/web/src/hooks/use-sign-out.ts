import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { App } from "antd";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
	const { message } = App.useApp();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return () =>
		authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					queryClient.clear();
					navigate({ to: "/login" });
				},
				onError: () => {
					message.error("Không thể đăng xuất");
				},
			},
		});
}
