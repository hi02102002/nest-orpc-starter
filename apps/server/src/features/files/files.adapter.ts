import { s3 } from "files-sdk/s3";

import { ENV } from "@/env.server";

export const createFilesAdapter = () =>
	s3({
		bucket: ENV.S3_BUCKET,
		region: ENV.S3_REGION,
		endpoint: ENV.S3_ENDPOINT,
		forcePathStyle: ENV.S3_FORCE_PATH_STYLE,
		credentials:
			ENV.S3_ACCESS_KEY_ID && ENV.S3_SECRET_ACCESS_KEY
				? {
						accessKeyId: ENV.S3_ACCESS_KEY_ID,
						secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
					}
				: undefined,
	});
