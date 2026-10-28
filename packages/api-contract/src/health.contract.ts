import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const healthCheckContract = oc
	.meta(openapi({ method: "GET", path: "/api/health-check" }))
	.output(z.literal("OK"));
