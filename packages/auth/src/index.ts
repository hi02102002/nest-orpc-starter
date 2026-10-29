import type { Database } from "@app/db";
import * as schema from "@app/db/schema/auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { openAPI } from "better-auth/plugins/open-api";

import { viI18n } from "./i18n";

const banExpiryDate = new Intl.DateTimeFormat("vi-VN", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "Asia/Ho_Chi_Minh",
});
const banExpiryTime = new Intl.DateTimeFormat("vi-VN", {
	hour: "2-digit",
	minute: "2-digit",
	hourCycle: "h23",
	timeZone: "Asia/Ho_Chi_Minh",
});
const formatBanExpiry = (date: Date) =>
	`${banExpiryDate.format(date)} ${banExpiryTime.format(date)}`;

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "pg",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		emailAndPassword: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			admin({
				defaultBanReason: "Không có lý do",
				bannedUserMessage: (user) =>
					user.banExpires
						? `Tài khoản của bạn đã bị khoá đến ${formatBanExpiry(user.banExpires)}.`
						: "Tài khoản của bạn đã bị khoá. Vui lòng liên hệ quản trị viên.",
			}),
			openAPI(),
			viI18n,
		],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
