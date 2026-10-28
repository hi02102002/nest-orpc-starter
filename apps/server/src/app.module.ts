import type { Database } from "@app/db";
import { Module } from "@nestjs/common";
import { getDrizzleToken } from "@nestjs/drizzle";
import { ScheduleModule } from "@nestjs/schedule";
import { ORPCModule } from "@orpc/nest";
import { onError } from "@orpc/server";
import {
	RequestHeadersHandlerPlugin,
	ResponseCompressionHandlerPlugin,
	ResponseHeadersHandlerPlugin,
} from "@orpc/server/plugins";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { toMiddlewareOptions } from "evlog";
import { EvlogModule, useLogger } from "evlog/nestjs";
import evlogConfig from "../evlog.config";
import { CrudModule } from "./features/crud/crud.module";
import { DocsModule } from "./features/docs/docs.module";
import { HealthModule } from "./features/health/health.module";
import { PrivateDataModule } from "./features/private-data/private-data.module";
import { createORPCContext } from "./lib/orpc/context";
import { type Auth, ServicesModule } from "./services.module";

@Module({
	imports: [
		EvlogModule.forRoot(toMiddlewareOptions(evlogConfig)),
		ServicesModule,
		ScheduleModule.forRoot(),
		ORPCModule.forRootAsync({
			imports: [ServicesModule],
			inject: [AuthService, getDrizzleToken()],
			useFactory: (authService: AuthService<Auth>, db: Database) => ({
				context: createORPCContext({ auth: authService.instance, db }),
				interceptors: [
					onError((error) => {
						const normalizedError =
							error instanceof Error ? error : new Error(String(error));

						try {
							useLogger().error(normalizedError);
						} catch {
							console.error(normalizedError);
						}
					}),
				],
				plugins: [
					new RequestHeadersHandlerPlugin(),
					new ResponseHeadersHandlerPlugin(),
					new ResponseCompressionHandlerPlugin(),
				],
			}),
		}),
		CrudModule,
		DocsModule,
		HealthModule,
		PrivateDataModule,
	],
})
export class AppModule {}
