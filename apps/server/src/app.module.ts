import { Module } from "@nestjs/common";
import { ORPCModule } from "@orpc/nest";
import { onError } from "@orpc/server";

import { HealthModule } from "./features/health/health.module";
import { PrivateDataModule } from "./features/private-data/private-data.module";
import { createORPCContext } from "./orpc-context";

@Module({
	imports: [
		ORPCModule.forRoot({
			context: createORPCContext,
			interceptors: [
				onError((error) => {
					console.error(error);
				}),
			],
		}),
		HealthModule,
		PrivateDataModule,
	],
})
export class AppModule {}
