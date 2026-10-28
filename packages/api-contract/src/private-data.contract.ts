import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { authedContract } from "./authed.contract";

export const privateDataContract = authedContract
	.meta(openapi({ method: "GET", path: "/api/private-data" }))
	.output(
		z.object({
			message: z.string(),
			user: z.object({
				id: z.string(),
				name: z.string(),
				email: z.string(),
				image: z.string().nullable(),
			}),
		}),
	);
