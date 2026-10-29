import { useFiles } from "files-sdk/react";

import { filesConfig } from "@/lib/files";

export function useAppFiles() {
	return useFiles(filesConfig);
}
