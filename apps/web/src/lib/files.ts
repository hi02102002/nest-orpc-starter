import type { FilesClientConfig } from "files-sdk/client";
import { createFilesClient } from "files-sdk/client";

import { ENV } from "../env";

export const filesConfig: FilesClientConfig = {
	endpoint: `${ENV.VITE_SERVER_URL.replace(/\/$/, "")}/api/files`,
	fetchImpl: (input, init) => fetch(input, { ...init, credentials: "include" }),
};

export const filesClient = createFilesClient(filesConfig);
