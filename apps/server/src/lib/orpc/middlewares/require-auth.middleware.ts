import { contract } from "@app/api-contract";
import { implement, ORPCError } from "@orpc/server";

export const requireAuth = implement(contract).middleware(
	({ context, next }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		return next({ context: { session: context.session } });
	},
);
