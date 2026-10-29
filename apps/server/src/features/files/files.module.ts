import { Module } from "@nestjs/common";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { Files, FilesError } from "files-sdk";
import { FilesModule as FilesGatewayModule } from "files-sdk/nestjs";

import { ENV } from "@/env.server";
import { type Auth, ServicesModule } from "@/services.module";
import { createFilesAdapter } from "./files.adapter";
import { FILES_API_PATH } from "./files.constants";

@Module({
	imports: [
		FilesGatewayModule.forRootAsync({
			imports: [ServicesModule],
			inject: [AuthService],
			useFactory: (authService: AuthService<Auth>) => ({
				files: new Files({ adapter: createFilesAdapter() }),
				path: FILES_API_PATH,
				allowedOrigins: [ENV.CORS_ORIGIN],
				secret: ENV.FILES_API_SECRET,
				operations: [
					"capabilities",
					"head",
					"exists",
					"list",
					"url",
					"download",
					"upload",
					"delete",
				],
				authorize: async ({ req }) => {
					const session = await authService.instance.api.getSession({
						headers: req.headers,
					});

					if (!session) {
						throw new FilesError("Unauthorized", "Sign in to access files");
					}

					return { keyPrefix: `users/${session.user.id}/` };
				},
			}),
		}),
	],
})
export class FilesModule {}
