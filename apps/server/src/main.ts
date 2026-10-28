import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { toNodeHandler } from "better-auth/node";
import { initLogger, toLoggerConfig } from "evlog";

import evlogConfig from "../evlog.config";
import { AppModule } from "./app.module";
import { ENV } from "./env.server";
import { auth } from "./services";

initLogger(toLoggerConfig(evlogConfig));

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.enableCors({
		origin: ENV.CORS_ORIGIN,
		methods: ["GET", "POST", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});
	app.use("/api/auth", toNodeHandler(auth));

	await app.listen(ENV.PORT);
	console.log(`Server is running on http://localhost:${ENV.PORT}`);
}

await bootstrap();
