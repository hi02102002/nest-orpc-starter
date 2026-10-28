import { implement, ORPCError } from "@orpc/server";
import { contract } from "@petshop/api-contract";

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
