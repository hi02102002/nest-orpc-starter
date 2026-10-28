import { Module } from "@nestjs/common";
import { ORPCModule } from "@orpc/nest";
import { onError } from "@orpc/server";

import { ApiController } from "./api.controller";
import { AppController } from "./app.controller";
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
	],
	controllers: [AppController, ApiController],
})
export class AppModule {}
