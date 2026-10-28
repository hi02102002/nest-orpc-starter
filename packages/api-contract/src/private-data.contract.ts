import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const privateDataContract = oc
	.meta(openapi({ method: "GET", path: "/api/private-data" }))
	.errors({
		UNAUTHORIZED: {
			message: "Authentication required",
		},
	})
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
