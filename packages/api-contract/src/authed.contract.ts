import { oc } from "@orpc/contract";

export const authedContract = oc.errors({
	UNAUTHORIZED: {
		message: "Authentication required",
	},
});
