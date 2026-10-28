import { Module } from "@nestjs/common";
import { ORPCModule } from "@orpc/nest";
import { onError } from "@orpc/server";
import { toMiddlewareOptions } from "evlog";
import { EvlogModule, useLogger } from "evlog/nestjs";

import evlogConfig from "../evlog.config";
import { HealthModule } from "./features/health/health.module";
import { PrivateDataModule } from "./features/private-data/private-data.module";
import { createORPCContext } from "./orpc-context";

@Module({
	imports: [
		EvlogModule.forRoot(toMiddlewareOptions(evlogConfig)),
		ORPCModule.forRoot({
			context: createORPCContext,
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
		}),
		HealthModule,
		PrivateDataModule,
	],
})
export class AppModule {}
