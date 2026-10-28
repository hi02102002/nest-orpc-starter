import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { apiReference } from "@scalar/nestjs-api-reference";
import { initLogger, toLoggerConfig } from "evlog";

import evlogConfig from "../evlog.config";
import { AppModule } from "./app.module";
import { ENV } from "./env.server";

initLogger(toLoggerConfig(evlogConfig));

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bodyParser: false });

	app.enableShutdownHooks();
	app.enableCors({
		origin: ENV.CORS_ORIGIN,
		methods: ["*"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	});
	app.use(
		"/docs",
		apiReference({
			pageTitle: "Petshop API Reference",
			theme: "default",
			sources: [
				{ title: "Petshop API", url: "/api/openapi.json" },
				{
					title: "Better Auth API",
					url: "/api/auth/open-api/generate-schema",
				},
			],
		}),
	);

	await app.listen(ENV.PORT);
	console.log(`Server is running on http://localhost:${ENV.PORT}`);
}

await bootstrap();
