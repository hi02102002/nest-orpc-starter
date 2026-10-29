import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { apiReference } from "@scalar/nestjs-api-reference";
import { initLogger, toLoggerConfig } from "evlog";

import evlogConfig from "../evlog.config";
import { AppModule } from "./app.module";
import { ENV } from "./env.server";
import { clientIpMiddleware } from "./lib/client-ip.middleware";

initLogger(toLoggerConfig(evlogConfig));

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bodyParser: false,
	});

	if (ENV.TRUST_PROXY) {
		app.set(
			"trust proxy",
			/^\d+$/.test(ENV.TRUST_PROXY) ? Number(ENV.TRUST_PROXY) : ENV.TRUST_PROXY,
		);
	}
	app.use(clientIpMiddleware);

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
			pageTitle: "API Reference",
			theme: "default",
			sources: [
				{ title: "API", url: "/api/openapi.json" },
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
