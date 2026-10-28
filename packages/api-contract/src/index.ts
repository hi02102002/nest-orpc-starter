import type { RouterContractClient } from "@orpc/contract";
import { oc } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const userSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	image: z.string().nullable(),
});

export const contract = {
	healthCheck: oc
		.meta(openapi({ method: "GET", path: "/api/health-check" }))
		.output(z.literal("OK")),
	privateData: oc
		.meta(openapi({ method: "GET", path: "/api/private-data" }))
		.errors({
			UNAUTHORIZED: {
				message: "Authentication required",
			},
		})
		.output(
			z.object({
				message: z.string(),
				user: userSchema,
			}),
		),
};

export type AppRouterClient = JsonifiedClient<
	RouterContractClient<typeof contract>
>;
