import type { IncomingMessage } from "node:http";
import { createAuth } from "@app/auth";
import { createDb, type Database } from "@app/db";
import { Global, Module } from "@nestjs/common";
import { DrizzleModule, getDrizzleToken } from "@nestjs/drizzle";
import { AuthModule } from "@thallesp/nestjs-better-auth";

import { FILES_API_PATH } from "@/features/files/files.constants";

import { ENV } from "./env.server";

export type Auth = ReturnType<typeof createAuth>;

const parseBodyUnlessFilesGateway =
	(mediaType: string) => (req: IncomingMessage & { originalUrl?: string }) => {
		const path = (req.originalUrl ?? req.url)?.split("?")[0] ?? "";
		if (path === FILES_API_PATH || path.startsWith(`${FILES_API_PATH}/`)) {
			return false;
		}
		return (
			req.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() ===
			mediaType
		);
	};

@Global()
@Module({
	imports: [
		DrizzleModule.forRootAsync({
			useFactory: () => ({ db: createDb(ENV) }),
		}),
		AuthModule.forRootAsync({
			disableGlobalAuthGuard: true,
			inject: [getDrizzleToken()],
			useFactory: (db: Database) => ({
				auth: createAuth(ENV, db),
				bodyParser: {
					json: { type: parseBodyUnlessFilesGateway("application/json") },
					urlencoded: {
						type: parseBodyUnlessFilesGateway(
							"application/x-www-form-urlencoded",
						),
					},
				},
			}),
		}),
	],
	exports: [DrizzleModule, AuthModule],
})
export class ServicesModule {}
