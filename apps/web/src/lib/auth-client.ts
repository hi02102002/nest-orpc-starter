import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ENV } from "../env";

export const authClient = createAuthClient({
	baseURL: ENV.VITE_SERVER_URL,
	plugins: [adminClient()],
});

export const isAdmin = (user?: { role?: string | null } | null) =>
	user?.role?.split(",").includes("admin") ?? false;
