import { Global, Module } from "@nestjs/common";
import { DrizzleModule, getDrizzleToken } from "@nestjs/drizzle";
import { createAuth } from "@petshop/auth";
import { createDb, type Database } from "@petshop/db";
import { AuthModule } from "@thallesp/nestjs-better-auth";

import { ENV } from "./env.server";

export type Auth = ReturnType<typeof createAuth>;

@Global()
@Module({
	imports: [
		DrizzleModule.forRootAsync({
			useFactory: () => ({ db: createDb(ENV) }),
		}),
		AuthModule.forRootAsync({
			disableGlobalAuthGuard: true,
			inject: [getDrizzleToken()],
			useFactory: (db: Database) => ({ auth: createAuth(ENV, db) }),
		}),
	],
	exports: [DrizzleModule, AuthModule],
})
export class ServicesModule {}
